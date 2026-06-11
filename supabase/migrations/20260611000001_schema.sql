-- ═══════════════════════════════════════════════════════════════════════
-- Charm Cafe Management System — Core Schema
-- Migration 001: Tables, constraints, indexes, triggers
-- ═══════════════════════════════════════════════════════════════════════

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enum Types ──────────────────────────────────────────────────────────────

CREATE TYPE cafe_role AS ENUM ('manager', 'staff');
CREATE TYPE order_type_enum AS ENUM ('dine-in', 'take-out');
CREATE TYPE payment_method_enum AS ENUM ('cash', 'gcash', 'split');
CREATE TYPE order_status_enum AS ENUM ('completed', 'voided');
CREATE TYPE movement_type_enum AS ENUM ('sale', 'stock_in', 'adjustment', 'waste', 'void_restore');
CREATE TYPE payroll_status_enum AS ENUM ('draft', 'paid');

-- ─── Profiles ────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  cafe_role           cafe_role NOT NULL DEFAULT 'staff',
  can_view_inventory  BOOLEAN NOT NULL DEFAULT false,
  can_add_expenses    BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  daily_rate          NUMERIC(10,2),
  hourly_rate         NUMERIC(10,2),
  pin_code            TEXT,                       -- bcrypt-hashed PIN for clock-in
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on new auth user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, cafe_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'cafe_role')::cafe_role, 'staff')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Settings (single-row) ───────────────────────────────────────────────────

CREATE TABLE settings (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data       JSONB NOT NULL DEFAULT '{
    "business_name":  "Charm Cafe",
    "tagline":        "A little charm in every cup",
    "logo_url":       null,
    "receipt_footer": "Thank you! Come back soon.",
    "currency":       "PHP",
    "timezone":       "Asia/Manila",
    "address":        "Cebu, Philippines",
    "contact":        "",
    "vat_enabled":    false,
    "vat_tin":        null,
    "vat_rate":       0.12,
    "or_prefix":      "OR",
    "or_current":     0
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed single settings row
INSERT INTO settings DEFAULT VALUES;

-- ─── Categories ──────────────────────────────────────────────────────────────

CREATE TABLE product_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Units ───────────────────────────────────────────────────────────────────

CREATE TABLE units (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ─── Inventory Items ─────────────────────────────────────────────────────────

CREATE TABLE inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  category_id         UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  unit_id             UUID REFERENCES units(id) ON DELETE SET NULL,
  current_stock       NUMERIC(14,4) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_cost           NUMERIC(12,4) NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(current_stock, low_stock_threshold) WHERE is_active = true;

-- ─── Products ────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  category_id  UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  image_url    TEXT,
  description  TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available) WHERE is_available = true;

-- ─── Product Variants (sizes) ────────────────────────────────────────────────

CREATE TABLE product_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL DEFAULT 'Regular',
  price      NUMERIC(10,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (product_id, size_label)
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- ─── Recipe Items (BOM — the heart of the system) ────────────────────────────

CREATE TABLE recipe_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id          UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  inventory_item_id   UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty_per_sale        NUMERIC(14,4) NOT NULL,
  UNIQUE (variant_id, inventory_item_id)
);

CREATE INDEX idx_recipe_items_variant ON recipe_items(variant_id);
CREATE INDEX idx_recipe_items_inventory ON recipe_items(inventory_item_id);

-- ─── Add-Ons ─────────────────────────────────────────────────────────────────

CREATE TABLE add_ons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE add_on_recipe_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  add_on_id         UUID NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty_per_sale      NUMERIC(14,4) NOT NULL,
  UNIQUE (add_on_id, inventory_item_id)
);

CREATE INDEX idx_addon_recipe_items_addon ON add_on_recipe_items(add_on_id);

-- ─── Orders ──────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no            TEXT NOT NULL UNIQUE,
  order_type          order_type_enum NOT NULL DEFAULT 'take-out',
  payment_method      payment_method_enum NOT NULL DEFAULT 'cash',
  cash_amount         NUMERIC(10,2),
  gcash_amount        NUMERIC(10,2),
  gcash_ref           TEXT,
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_type_id    TEXT,
  discount_type_name  TEXT,
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  amount_tendered     NUMERIC(10,2),
  change_due          NUMERIC(10,2),
  status              order_status_enum NOT NULL DEFAULT 'completed',
  void_reason         TEXT,
  voided_by           UUID REFERENCES profiles(id),
  voided_at           TIMESTAMPTZ,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_status ON orders(status);

-- ─── Order Items ─────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  size_label   TEXT NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total   NUMERIC(10,2) NOT NULL,
  is_voided    BOOLEAN NOT NULL DEFAULT false,
  void_reason  TEXT,
  voided_by    UUID REFERENCES profiles(id),
  voided_at    TIMESTAMPTZ
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);

-- ─── Order Item Add-Ons ───────────────────────────────────────────────────────

CREATE TABLE order_item_add_ons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  add_on_id     UUID REFERENCES add_ons(id) ON DELETE SET NULL,
  add_on_name   TEXT NOT NULL,
  price         NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_order_item_addons_item ON order_item_add_ons(order_item_id);

-- ─── Stock Movements (append-only ledger) ────────────────────────────────────

CREATE TABLE stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty_change        NUMERIC(14,4) NOT NULL,       -- negative = deduction
  movement_type     movement_type_enum NOT NULL,
  reference_id      UUID,                         -- order_id, purchase_id, or order_item_id
  reference_type    TEXT,                         -- 'order' | 'purchase' | 'order_item_void'
  note              TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_item ON stock_movements(inventory_item_id, created_at DESC);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- ─── Purchases (stock-in) ─────────────────────────────────────────────────────

CREATE TABLE purchases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier   TEXT,
  notes      TEXT,
  total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id       UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity          NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  unit_cost         NUMERIC(12,4) NOT NULL,
  line_total        NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);

-- ─── Expenses ────────────────────────────────────────────────────────────────

CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note         TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url  TEXT,
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);

-- ─── Assets ──────────────────────────────────────────────────────────────────

CREATE TABLE assets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  purchase_price NUMERIC(10,2) NOT NULL CHECK (purchase_price >= 0),
  purchase_date  DATE,
  note           TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Time Logs ───────────────────────────────────────────────────────────────

CREATE TABLE time_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in         TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out        TIMESTAMPTZ,
  hours_worked     NUMERIC(8,4),                  -- computed on clock-out
  adjustment_note  TEXT,
  adjusted_by      UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_clock_order CHECK (clock_out IS NULL OR clock_out > clock_in)
);

CREATE INDEX idx_time_logs_profile ON time_logs(profile_id, clock_in DESC);

-- Auto-compute hours_worked when clock_out is set
CREATE OR REPLACE FUNCTION compute_hours_worked()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND OLD.clock_out IS NULL THEN
    NEW.hours_worked := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_hours
  BEFORE UPDATE ON time_logs
  FOR EACH ROW EXECUTE FUNCTION compute_hours_worked();

-- ─── Payroll ─────────────────────────────────────────────────────────────────

CREATE TABLE payroll_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       payroll_status_enum NOT NULL DEFAULT 'draft',
  paid_at      TIMESTAMPTZ,
  paid_by      UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_period_order CHECK (period_end >= period_start)
);

CREATE TABLE payroll_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  hours_worked      NUMERIC(10,4) NOT NULL DEFAULT 0,
  days_worked       NUMERIC(8,4) NOT NULL DEFAULT 0,
  base_pay          NUMERIC(10,2) NOT NULL DEFAULT 0,
  adjustments       JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_pay         NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  UNIQUE (payroll_period_id, profile_id)
);

-- ─── Auto-update updated_at ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at       BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_items_updated   BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated          BEFORE UPDATE ON products        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated          BEFORE UPDATE ON expenses        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_settings_updated          BEFORE UPDATE ON settings        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Product Availability View ───────────────────────────────────────────────
-- True auto-86: a variant can_sell = false if any recipe ingredient is insufficient.

CREATE OR REPLACE VIEW product_availability AS
SELECT
  p.id                                                                AS product_id,
  pv.id                                                               AS variant_id,
  p.name                                                              AS product_name,
  p.category_id,
  pv.size_label,
  pv.price,
  p.is_available,
  pv.is_active                                                        AS variant_is_active,
  CASE
    WHEN NOT p.is_available        THEN false
    WHEN NOT pv.is_active          THEN false
    WHEN EXISTS (
      SELECT 1
      FROM   recipe_items ri
      JOIN   inventory_items ii ON ii.id = ri.inventory_item_id
      WHERE  ri.variant_id = pv.id
      AND    ii.current_stock < ri.qty_per_sale
    )                              THEN false
    ELSE                                true
  END                                                                 AS can_sell,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'inventory_item_id',   ri.inventory_item_id,
        'inventory_item_name', ii.name,
        'required',            ri.qty_per_sale,
        'available',           ii.current_stock,
        'sufficient',          ii.current_stock >= ri.qty_per_sale
      )
    )
    FROM   recipe_items ri
    JOIN   inventory_items ii ON ii.id = ri.inventory_item_id
    WHERE  ri.variant_id = pv.id
  )                                                                   AS recipe_status
FROM  products p
JOIN  product_variants pv ON pv.product_id = p.id
WHERE p.is_active IS NOT FALSE            -- support future soft-delete
AND   pv.is_active = true;
