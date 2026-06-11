-- ═══════════════════════════════════════════════════════════════════════
-- Charm Cafe Management System — Row Level Security
-- Migration 002: RLS policies for all tables
-- ═══════════════════════════════════════════════════════════════════════

-- Helper: get the cafe_role of the currently authenticated user
CREATE OR REPLACE FUNCTION auth_cafe_role()
RETURNS cafe_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT cafe_role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT cafe_role = 'manager' FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_can_view_inventory()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT cafe_role = 'manager' OR can_view_inventory
  FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_can_add_expenses()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT cafe_role = 'manager' OR can_add_expenses
  FROM profiles WHERE id = auth.uid()
$$;

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units              ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_on_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries    ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ────────────────────────────────────────────────────────────────

-- Anyone can read their own profile
CREATE POLICY "profiles_read_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Managers can read all profiles
CREATE POLICY "profiles_read_all_manager"
  ON profiles FOR SELECT
  USING (auth_is_manager());

-- Users can update their own non-sensitive fields
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-promotion to manager via this policy
    AND cafe_role = (SELECT cafe_role FROM profiles WHERE id = auth.uid())
  );

-- Only managers can update any profile (including role changes)
CREATE POLICY "profiles_update_manager"
  ON profiles FOR UPDATE
  USING (auth_is_manager());

-- No delete (deactivate via is_active flag instead)

-- ─── Settings ────────────────────────────────────────────────────────────────

-- All authenticated users can read settings (needed for POS config)
CREATE POLICY "settings_read_all"
  ON settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only managers can update
CREATE POLICY "settings_update_manager"
  ON settings FOR UPDATE
  USING (auth_is_manager());

-- ─── Product Categories ───────────────────────────────────────────────────────

CREATE POLICY "product_categories_read"
  ON product_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "product_categories_write_manager"
  ON product_categories FOR ALL
  USING (auth_is_manager());

-- ─── Inventory Categories ─────────────────────────────────────────────────────

CREATE POLICY "inventory_categories_read"
  ON inventory_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "inventory_categories_write_manager"
  ON inventory_categories FOR ALL
  USING (auth_is_manager());

-- ─── Units ───────────────────────────────────────────────────────────────────

CREATE POLICY "units_read"
  ON units FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "units_write_manager"
  ON units FOR ALL
  USING (auth_is_manager());

-- ─── Inventory Items ─────────────────────────────────────────────────────────

-- Managers always see all; staff see only if permission flag set
CREATE POLICY "inventory_items_read"
  ON inventory_items FOR SELECT
  USING (auth_can_view_inventory());

-- Only managers can write
CREATE POLICY "inventory_items_write_manager"
  ON inventory_items FOR INSERT
  WITH CHECK (auth_is_manager());

CREATE POLICY "inventory_items_update_manager"
  ON inventory_items FOR UPDATE
  USING (auth_is_manager());

CREATE POLICY "inventory_items_delete_manager"
  ON inventory_items FOR DELETE
  USING (auth_is_manager());

-- ─── Products & Variants ─────────────────────────────────────────────────────

-- All staff can read products (needed for POS)
CREATE POLICY "products_read"
  ON products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_write_manager"
  ON products FOR ALL
  USING (auth_is_manager());

CREATE POLICY "product_variants_read"
  ON product_variants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "product_variants_write_manager"
  ON product_variants FOR ALL
  USING (auth_is_manager());

-- ─── Recipe Items ────────────────────────────────────────────────────────────

CREATE POLICY "recipe_items_read"
  ON recipe_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "recipe_items_write_manager"
  ON recipe_items FOR ALL
  USING (auth_is_manager());

-- ─── Add-Ons ─────────────────────────────────────────────────────────────────

CREATE POLICY "add_ons_read"
  ON add_ons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "add_ons_write_manager"
  ON add_ons FOR ALL
  USING (auth_is_manager());

CREATE POLICY "add_on_recipe_items_read"
  ON add_on_recipe_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "add_on_recipe_items_write_manager"
  ON add_on_recipe_items FOR ALL
  USING (auth_is_manager());

-- ─── Orders ──────────────────────────────────────────────────────────────────

-- Staff can read their own orders; managers read all
CREATE POLICY "orders_read_own"
  ON orders FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "orders_read_all_manager"
  ON orders FOR SELECT
  USING (auth_is_manager());

-- Staff can create orders (via complete_sale RPC which uses SECURITY DEFINER)
-- Direct insert allowed for the RPC context
CREATE POLICY "orders_insert"
  ON orders FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Only managers can void/update orders
CREATE POLICY "orders_update_manager"
  ON orders FOR UPDATE
  USING (auth_is_manager());

-- ─── Order Items ─────────────────────────────────────────────────────────────

CREATE POLICY "order_items_read"
  ON order_items FOR SELECT
  USING (
    auth_is_manager()
    OR EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_id AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "order_items_insert"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_id AND o.created_by = auth.uid()
    )
    OR auth_is_manager()
  );

CREATE POLICY "order_items_update_manager"
  ON order_items FOR UPDATE
  USING (auth_is_manager());

-- ─── Order Item Add-Ons ───────────────────────────────────────────────────────

CREATE POLICY "order_item_addons_read"
  ON order_item_add_ons FOR SELECT
  USING (
    auth_is_manager()
    OR EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "order_item_addons_insert"
  ON order_item_add_ons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id AND o.created_by = auth.uid()
    )
    OR auth_is_manager()
  );

-- ─── Stock Movements (append-only) ───────────────────────────────────────────

-- Managers + permitted staff can view
CREATE POLICY "stock_movements_read"
  ON stock_movements FOR SELECT
  USING (auth_can_view_inventory());

-- Insert through RPCs (SECURITY DEFINER) — no direct insert for clients
-- Manual insert still allowed for managers
CREATE POLICY "stock_movements_insert_manager"
  ON stock_movements FOR INSERT
  WITH CHECK (auth_is_manager());

-- No UPDATE or DELETE — ledger is append-only

-- ─── Purchases ───────────────────────────────────────────────────────────────

CREATE POLICY "purchases_read"
  ON purchases FOR SELECT
  USING (auth_can_view_inventory());

CREATE POLICY "purchases_write_manager"
  ON purchases FOR ALL
  USING (auth_is_manager());

CREATE POLICY "purchase_items_read"
  ON purchase_items FOR SELECT
  USING (auth_can_view_inventory());

CREATE POLICY "purchase_items_write_manager"
  ON purchase_items FOR ALL
  USING (auth_is_manager());

-- ─── Expenses ────────────────────────────────────────────────────────────────

-- Managers read all; staff with permission read all
CREATE POLICY "expenses_read"
  ON expenses FOR SELECT
  USING (
    auth_is_manager()
    OR (auth_can_add_expenses() AND created_by = auth.uid())
  );

-- Staff with permission can insert (for their own)
CREATE POLICY "expenses_insert"
  ON expenses FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND auth_can_add_expenses()
  );

-- Staff can update/delete only their own same-day entries; managers full control
CREATE POLICY "expenses_update_own_today"
  ON expenses FOR UPDATE
  USING (
    (created_by = auth.uid() AND expense_date = CURRENT_DATE AND auth_can_add_expenses())
    OR auth_is_manager()
  );

CREATE POLICY "expenses_delete"
  ON expenses FOR DELETE
  USING (
    (created_by = auth.uid() AND expense_date = CURRENT_DATE AND auth_can_add_expenses())
    OR auth_is_manager()
  );

-- ─── Assets ──────────────────────────────────────────────────────────────────

CREATE POLICY "assets_read_manager"
  ON assets FOR SELECT
  USING (auth_is_manager());

CREATE POLICY "assets_write_manager"
  ON assets FOR ALL
  USING (auth_is_manager());

-- ─── Time Logs ───────────────────────────────────────────────────────────────

-- Staff see their own; managers see all
CREATE POLICY "time_logs_read_own"
  ON time_logs FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "time_logs_read_all_manager"
  ON time_logs FOR SELECT
  USING (auth_is_manager());

-- Staff can clock in/out for themselves
CREATE POLICY "time_logs_insert_own"
  ON time_logs FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "time_logs_update_own_open"
  ON time_logs FOR UPDATE
  USING (
    (profile_id = auth.uid() AND clock_out IS NULL)  -- staff can only clock out their own open log
    OR auth_is_manager()                              -- managers can correct any entry
  );

-- ─── Payroll ─────────────────────────────────────────────────────────────────

CREATE POLICY "payroll_periods_manager"
  ON payroll_periods FOR ALL
  USING (auth_is_manager());

CREATE POLICY "payroll_entries_manager"
  ON payroll_entries FOR ALL
  USING (auth_is_manager());

-- Staff can read their own payroll entries
CREATE POLICY "payroll_entries_read_own"
  ON payroll_entries FOR SELECT
  USING (profile_id = auth.uid());
