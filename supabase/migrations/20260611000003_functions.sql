-- ═══════════════════════════════════════════════════════════════════════
-- Charm Cafe Management System — Postgres Functions / RPCs
-- Migration 003: complete_sale, void_order_item, stock_in, adjust_stock
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- complete_sale(...)
--
-- Atomically:
--   1. Checks stock sufficiency for ALL items BEFORE touching anything
--   2. Creates the order row
--   3. Creates order_items + order_item_add_ons
--   4. Deducts recipe ingredients from inventory_items.current_stock
--   5. Appends stock_movements rows for every deduction
--
-- Called from the POS checkout. All-or-nothing — any stock shortfall rolls
-- back the whole transaction and raises a descriptive EXCEPTION.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_sale(
  p_order_type        TEXT,
  p_payment_method    TEXT,
  p_cash_amount       NUMERIC,
  p_gcash_amount      NUMERIC,
  p_gcash_ref         TEXT,
  p_discount_type_id  TEXT,
  p_discount_type_name TEXT,
  p_discount_amount   NUMERIC,
  p_amount_tendered   NUMERIC,
  p_created_by        UUID,
  p_items             JSONB
  -- Each element: {
  --   variant_id: uuid,
  --   qty: int,
  --   unit_price: numeric,  (base variant price, no add-ons)
  --   product_name: text,
  --   size_label: text,
  --   add_ons: [{add_on_id: uuid, add_on_name: text, price: numeric}]
  -- }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_no        TEXT;
  v_order_id        UUID;
  v_subtotal        NUMERIC := 0;
  v_total           NUMERIC;
  v_change_due      NUMERIC;
  v_item            JSONB;
  v_addon           JSONB;
  v_order_item_id   UUID;
  v_qty             INTEGER;
  v_unit_price      NUMERIC;
  v_line_total      NUMERIC;
  v_addons_total    NUMERIC;

  -- Stock check vars
  r_recipe          RECORD;
  r_addon_recipe    RECORD;
  v_needed          NUMERIC;
  v_available       NUMERIC;
BEGIN
  -- ── 1. Validate caller ──────────────────────────────────────────────────────
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'created_by is required' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_created_by AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive user' USING ERRCODE = 'P0001';
  END IF;

  -- ── 2. Pre-flight stock check (fail fast before any writes) ─────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'qty')::INTEGER;

    -- Check product variant recipe
    FOR r_recipe IN
      SELECT ri.qty_per_sale, ii.name AS item_name, ii.current_stock
      FROM   recipe_items ri
      JOIN   inventory_items ii ON ii.id = ri.inventory_item_id
      WHERE  ri.variant_id = (v_item->>'variant_id')::UUID
    LOOP
      v_needed    := r_recipe.qty_per_sale * v_qty;
      v_available := r_recipe.current_stock;
      IF v_available < v_needed THEN
        RAISE EXCEPTION 'Insufficient stock for "%": need %, have % (order would require restocking first)',
          r_recipe.item_name, v_needed, v_available
          USING ERRCODE = 'P0001';
      END IF;
    END LOOP;

    -- Check add-on recipes
    FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'add_ons')
    LOOP
      FOR r_addon_recipe IN
        SELECT ri.qty_per_sale, ii.name AS item_name, ii.current_stock
        FROM   add_on_recipe_items ri
        JOIN   inventory_items ii ON ii.id = ri.inventory_item_id
        WHERE  ri.add_on_id = (v_addon->>'add_on_id')::UUID
      LOOP
        v_needed    := r_addon_recipe.qty_per_sale * v_qty;
        v_available := r_addon_recipe.current_stock;
        IF v_available < v_needed THEN
          RAISE EXCEPTION 'Insufficient stock for add-on ingredient "%": need %, have %',
            r_addon_recipe.item_name, v_needed, v_available
            USING ERRCODE = 'P0001';
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- ── 3. Compute subtotal ─────────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty        := (v_item->>'qty')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_addons_total := 0;

    FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'add_ons')
    LOOP
      v_addons_total := v_addons_total + (v_addon->>'price')::NUMERIC;
    END LOOP;

    v_subtotal := v_subtotal + (v_unit_price + v_addons_total) * v_qty;
  END LOOP;

  v_total      := v_subtotal - COALESCE(p_discount_amount, 0);
  v_change_due := CASE
    WHEN p_payment_method = 'cash'  THEN COALESCE(p_amount_tendered, 0) - v_total
    WHEN p_payment_method = 'split' THEN (COALESCE(p_cash_amount, 0) + COALESCE(p_gcash_amount, 0)) - v_total
    ELSE 0
  END;

  -- ── 4. Generate order number ─────────────────────────────────────────────────
  SELECT 'ORD-' || LPAD(
    (COALESCE(
      MAX(CAST(SUBSTRING(order_no FROM 5) AS INTEGER)), 0
    ) + 1)::TEXT,
    4, '0'
  )
  INTO v_order_no
  FROM orders;

  -- ── 5. Create order ──────────────────────────────────────────────────────────
  INSERT INTO orders (
    order_no, order_type, payment_method,
    cash_amount, gcash_amount, gcash_ref,
    subtotal, discount_type_id, discount_type_name, discount_amount,
    total, amount_tendered, change_due,
    status, created_by
  )
  VALUES (
    v_order_no,
    p_order_type::order_type_enum,
    p_payment_method::payment_method_enum,
    p_cash_amount, p_gcash_amount, p_gcash_ref,
    v_subtotal, p_discount_type_id, p_discount_type_name,
    COALESCE(p_discount_amount, 0),
    v_total, p_amount_tendered, v_change_due,
    'completed', p_created_by
  )
  RETURNING id INTO v_order_id;

  -- ── 6. Create items, deduct stock ─────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty        := (v_item->>'qty')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_addons_total := 0;

    FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'add_ons')
    LOOP
      v_addons_total := v_addons_total + (v_addon->>'price')::NUMERIC;
    END LOOP;

    v_line_total := (v_unit_price + v_addons_total) * v_qty;

    INSERT INTO order_items (
      order_id, variant_id, product_name, size_label,
      unit_price, quantity, line_total
    )
    VALUES (
      v_order_id,
      (v_item->>'variant_id')::UUID,
      v_item->>'product_name',
      v_item->>'size_label',
      v_unit_price,
      v_qty,
      v_line_total
    )
    RETURNING id INTO v_order_item_id;

    -- Insert add-ons for this item
    FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'add_ons')
    LOOP
      INSERT INTO order_item_add_ons (order_item_id, add_on_id, add_on_name, price)
      VALUES (
        v_order_item_id,
        (v_addon->>'add_on_id')::UUID,
        v_addon->>'add_on_name',
        (v_addon->>'price')::NUMERIC
      );
    END LOOP;

    -- Deduct product variant recipe ingredients
    FOR r_recipe IN
      SELECT ri.inventory_item_id, ri.qty_per_sale
      FROM   recipe_items ri
      WHERE  ri.variant_id = (v_item->>'variant_id')::UUID
    LOOP
      UPDATE inventory_items
      SET    current_stock = current_stock - (r_recipe.qty_per_sale * v_qty),
             updated_at    = now()
      WHERE  id = r_recipe.inventory_item_id;

      INSERT INTO stock_movements (
        inventory_item_id, qty_change, movement_type,
        reference_id, reference_type, note, created_by
      )
      VALUES (
        r_recipe.inventory_item_id,
        -(r_recipe.qty_per_sale * v_qty),
        'sale',
        v_order_id,
        'order',
        (v_item->>'product_name') || ' ' || (v_item->>'size_label') || ' x' || v_qty,
        p_created_by
      );
    END LOOP;

    -- Deduct add-on recipe ingredients
    FOR v_addon IN SELECT * FROM jsonb_array_elements(v_item->'add_ons')
    LOOP
      FOR r_addon_recipe IN
        SELECT ri.inventory_item_id, ri.qty_per_sale
        FROM   add_on_recipe_items ri
        WHERE  ri.add_on_id = (v_addon->>'add_on_id')::UUID
      LOOP
        UPDATE inventory_items
        SET    current_stock = current_stock - (r_addon_recipe.qty_per_sale * v_qty),
               updated_at    = now()
        WHERE  id = r_addon_recipe.inventory_item_id;

        INSERT INTO stock_movements (
          inventory_item_id, qty_change, movement_type,
          reference_id, reference_type, note, created_by
        )
        VALUES (
          r_addon_recipe.inventory_item_id,
          -(r_addon_recipe.qty_per_sale * v_qty),
          'sale',
          v_order_id,
          'order',
          'Add-on: ' || (v_addon->>'add_on_name') || ' x' || v_qty,
          p_created_by
        );
      END LOOP;
    END LOOP;
  END LOOP;

  -- ── 7. Return result ──────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'order_id',   v_order_id,
    'order_no',   v_order_no,
    'subtotal',   v_subtotal,
    'total',      v_total,
    'change_due', v_change_due
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Ensure transaction rolls back and re-raise
    RAISE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- void_order_item(order_item_id, reason, voided_by)
--
-- Marks a single order item as voided and restores its stock.
-- Requires manager role (enforced via RLS + internal check).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION void_order_item(
  p_order_item_id UUID,
  p_void_reason   TEXT,
  p_voided_by     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item          order_items%ROWTYPE;
  v_addon         order_item_add_ons%ROWTYPE;
  r_recipe        RECORD;
  r_addon_recipe  RECORD;
BEGIN
  -- ── Only managers can void ──────────────────────────────────────────────────
  IF NOT (SELECT cafe_role = 'manager' FROM profiles WHERE id = p_voided_by) THEN
    RAISE EXCEPTION 'Only managers can void order items' USING ERRCODE = 'P0003';
  END IF;

  -- ── Fetch and lock the item ──────────────────────────────────────────────────
  SELECT * INTO v_item
  FROM   order_items
  WHERE  id = p_order_item_id
  FOR    UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_item.is_voided THEN
    RAISE EXCEPTION 'Order item is already voided' USING ERRCODE = 'P0002';
  END IF;

  -- ── Mark voided ──────────────────────────────────────────────────────────────
  UPDATE order_items
  SET    is_voided  = true,
         void_reason = p_void_reason,
         voided_by  = p_voided_by,
         voided_at  = now()
  WHERE  id = p_order_item_id;

  -- ── Restore product recipe stock ─────────────────────────────────────────────
  FOR r_recipe IN
    SELECT ri.inventory_item_id, ri.qty_per_sale
    FROM   recipe_items ri
    WHERE  ri.variant_id = v_item.variant_id
  LOOP
    UPDATE inventory_items
    SET    current_stock = current_stock + (r_recipe.qty_per_sale * v_item.quantity),
           updated_at    = now()
    WHERE  id = r_recipe.inventory_item_id;

    INSERT INTO stock_movements (
      inventory_item_id, qty_change, movement_type,
      reference_id, reference_type, note, created_by
    )
    VALUES (
      r_recipe.inventory_item_id,
      r_recipe.qty_per_sale * v_item.quantity,
      'void_restore',
      p_order_item_id,
      'order_item_void',
      'Void: ' || v_item.product_name || ' — ' || p_void_reason,
      p_voided_by
    );
  END LOOP;

  -- ── Restore add-on recipe stock ───────────────────────────────────────────────
  FOR v_addon IN
    SELECT * FROM order_item_add_ons WHERE order_item_id = p_order_item_id
  LOOP
    FOR r_addon_recipe IN
      SELECT ri.inventory_item_id, ri.qty_per_sale
      FROM   add_on_recipe_items ri
      WHERE  ri.add_on_id = v_addon.add_on_id
    LOOP
      UPDATE inventory_items
      SET    current_stock = current_stock + (r_addon_recipe.qty_per_sale * v_item.quantity),
             updated_at    = now()
      WHERE  id = r_addon_recipe.inventory_item_id;

      INSERT INTO stock_movements (
        inventory_item_id, qty_change, movement_type,
        reference_id, reference_type, note, created_by
      )
      VALUES (
        r_addon_recipe.inventory_item_id,
        r_addon_recipe.qty_per_sale * v_item.quantity,
        'void_restore',
        p_order_item_id,
        'order_item_void',
        'Void add-on: ' || v_addon.add_on_name || ' — ' || p_void_reason,
        p_voided_by
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success',       true,
    'order_item_id', p_order_item_id,
    'product_name',  v_item.product_name
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_in(purchase_id, items, created_by)
--
-- Processes a purchase: updates unit_cost (weighted average), increments
-- current_stock, and logs stock_movements for each item.
-- Called by the Inventory → Stock In flow.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION process_stock_in(
  p_supplier   TEXT,
  p_notes      TEXT,
  p_created_by UUID,
  p_items      JSONB
  -- Each element: {inventory_item_id: uuid, quantity: numeric, unit_cost: numeric}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id  UUID;
  v_total        NUMERIC := 0;
  v_item         JSONB;
  v_qty          NUMERIC;
  v_unit_cost    NUMERIC;
  v_item_id      UUID;
  v_line_total   NUMERIC;
  r_item         inventory_items%ROWTYPE;
  v_new_avg_cost NUMERIC;
BEGIN
  -- ── Only managers ──────────────────────────────────────────────────────────
  IF NOT (SELECT cafe_role = 'manager' FROM profiles WHERE id = p_created_by) THEN
    RAISE EXCEPTION 'Only managers can process stock-in' USING ERRCODE = 'P0003';
  END IF;

  -- ── Compute total ──────────────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (v_item->>'quantity')::NUMERIC * (v_item->>'unit_cost')::NUMERIC;
  END LOOP;

  -- ── Create purchase header ─────────────────────────────────────────────────
  INSERT INTO purchases (supplier, notes, total, created_by)
  VALUES (p_supplier, p_notes, v_total, p_created_by)
  RETURNING id INTO v_purchase_id;

  -- ── Process each line ─────────────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id  := (v_item->>'inventory_item_id')::UUID;
    v_qty      := (v_item->>'quantity')::NUMERIC;
    v_unit_cost := (v_item->>'unit_cost')::NUMERIC;
    v_line_total := v_qty * v_unit_cost;

    -- Insert purchase item line
    INSERT INTO purchase_items (
      purchase_id, inventory_item_id, quantity, unit_cost, line_total
    )
    VALUES (v_purchase_id, v_item_id, v_qty, v_unit_cost, v_line_total);

    -- Fetch current state for weighted average cost
    SELECT * INTO r_item FROM inventory_items WHERE id = v_item_id FOR UPDATE;

    -- Weighted average cost: (old_stock * old_cost + new_qty * new_cost) / (old_stock + new_qty)
    IF (r_item.current_stock + v_qty) > 0 THEN
      v_new_avg_cost := (r_item.current_stock * r_item.unit_cost + v_qty * v_unit_cost)
                        / (r_item.current_stock + v_qty);
    ELSE
      v_new_avg_cost := v_unit_cost;
    END IF;

    -- Update stock and cost
    UPDATE inventory_items
    SET    current_stock = current_stock + v_qty,
           unit_cost     = v_new_avg_cost,
           updated_at    = now()
    WHERE  id = v_item_id;

    -- Log movement
    INSERT INTO stock_movements (
      inventory_item_id, qty_change, movement_type,
      reference_id, reference_type, note, created_by
    )
    VALUES (
      v_item_id,
      v_qty,
      'stock_in',
      v_purchase_id,
      'purchase',
      COALESCE(p_supplier, 'Stock in') || ' — ' || v_qty || ' units @ ₱' || v_unit_cost,
      p_created_by
    );
  END LOOP;

  RETURN jsonb_build_object(
    'purchase_id', v_purchase_id,
    'total',       v_total
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- adjust_stock(inventory_item_id, qty_change, movement_type, note, created_by)
--
-- Manual stock adjustment or waste log. Requires manager.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION adjust_stock(
  p_inventory_item_id UUID,
  p_qty_change        NUMERIC,   -- positive = add, negative = subtract
  p_movement_type     TEXT,      -- 'adjustment' | 'waste'
  p_note              TEXT,
  p_created_by        UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock NUMERIC;
BEGIN
  IF NOT (SELECT cafe_role = 'manager' FROM profiles WHERE id = p_created_by) THEN
    RAISE EXCEPTION 'Only managers can adjust stock' USING ERRCODE = 'P0003';
  END IF;

  UPDATE inventory_items
  SET    current_stock = current_stock + p_qty_change,
         updated_at    = now()
  WHERE  id = p_inventory_item_id
  RETURNING current_stock INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO stock_movements (
    inventory_item_id, qty_change, movement_type, note, created_by
  )
  VALUES (
    p_inventory_item_id,
    p_qty_change,
    p_movement_type::movement_type_enum,
    p_note,
    p_created_by
  );

  RETURN jsonb_build_object(
    'inventory_item_id', p_inventory_item_id,
    'qty_change',        p_qty_change,
    'new_stock',         v_new_stock
  );
END;
$$;

-- ─── Grant RPC execute permissions ───────────────────────────────────────────

GRANT EXECUTE ON FUNCTION complete_sale TO authenticated;
GRANT EXECUTE ON FUNCTION void_order_item TO authenticated;
GRANT EXECUTE ON FUNCTION process_stock_in TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_stock TO authenticated;
