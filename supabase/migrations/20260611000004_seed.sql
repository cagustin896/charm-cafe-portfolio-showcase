-- ═══════════════════════════════════════════════════════════════════════
-- Charm Cafe Management System — Seed Data
-- Migration 004: Realistic Charm Cafe demo data (Cebu, Philippines)
--
-- HOW TO USE:
--   1. Run migrations 001–003 first.
--   2. Create your first manager account via Supabase Auth (email/password).
--   3. Run this seed file: it seeds categories, units, inventory, products,
--      variants, recipes, add-ons, assets, and a few sample expenses.
--   4. Promote the first user to manager:
--        UPDATE profiles SET cafe_role = 'manager' WHERE id = '<your-user-id>';
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Product Categories ───────────────────────────────────────────────────────

INSERT INTO product_categories (name, sort_order) VALUES
  ('Milk Series',    1),
  ('Iced Coffee',    2),
  ('Fruity Soda',    3),
  ('Food',           4),
  ('Add-ons',        5)
ON CONFLICT (name) DO NOTHING;

-- ─── Inventory Categories ─────────────────────────────────────────────────────

INSERT INTO inventory_categories (name, sort_order) VALUES
  ('Coffee Base',    1),
  ('Milk & Cream',   2),
  ('Syrups',         3),
  ('Powders',        4),
  ('Fruits & Fresh', 5),
  ('Packaging',      6),
  ('Food',           7),
  ('Beverages',      8)
ON CONFLICT (name) DO NOTHING;

-- ─── Units ───────────────────────────────────────────────────────────────────

INSERT INTO units (name, sort_order) VALUES
  ('ml',   1),
  ('g',    2),
  ('pcs',  3),
  ('tbsp', 4),
  ('tsp',  5),
  ('L',    6)
ON CONFLICT (name) DO NOTHING;

-- ─── Inventory Items ─────────────────────────────────────────────────────────
-- Using CTEs to reference category/unit IDs cleanly

WITH
  cats AS (SELECT id, name FROM inventory_categories),
  u    AS (SELECT id, name FROM units)

INSERT INTO inventory_items (name, category_id, unit_id, current_stock, low_stock_threshold, unit_cost)
SELECT
  item.name,
  (SELECT id FROM cats WHERE name = item.cat),
  (SELECT id FROM u    WHERE name = item.unit),
  item.stock,
  item.reorder,
  item.cost
FROM (VALUES
  -- name,                     category,         unit,   stock,   reorder,  unit_cost
  ('Espresso Shots',           'Coffee Base',    'ml',    800,    200,      0.25),
  ('Condensed Milk',           'Milk & Cream',   'g',    5000,   2000,     0.10),
  ('Fresh Milk',               'Milk & Cream',   'ml',   4000,   1500,     0.08),
  ('All-Purpose Cream',        'Milk & Cream',   'ml',   2000,   800,      0.18),
  ('Spanish Latte Syrup',      'Syrups',         'ml',   1200,   400,      0.22),
  ('Caramel Syrup',            'Syrups',         'ml',    800,   300,      0.20),
  ('Biscoff Spread/Crumbs',    'Powders',        'g',    1000,   300,      0.60),
  ('Chocolate Powder',         'Powders',        'g',     800,   300,      0.43),
  ('Matcha Powder',            'Powders',        'g',     500,   150,      1.20),
  ('Blueberry Jam',            'Fruits & Fresh', 'g',    2000,   500,      0.15),
  ('Mango Puree',              'Fruits & Fresh', 'ml',   1500,   500,      0.18),
  ('Coke (330ml can)',         'Beverages',      'pcs',   48,     20,      17.00),
  ('Green Apple Soda Syrup',   'Syrups',         'ml',   1000,   300,      0.16),
  ('Lychee Syrup',             'Syrups',         'ml',   1000,   300,      0.16),
  ('Plastic Cup 16oz',         'Packaging',      'pcs',   200,   100,      2.20),
  ('Plastic Cup 22oz',         'Packaging',      'pcs',   200,   100,      2.50),
  ('Boba Straw 23cm',          'Packaging',      'pcs',   300,    80,      0.85),
  ('Plastic Lid',              'Packaging',      'pcs',   400,   100,      0.60),
  ('Ice',                      'Beverages',      'g',   10000,  3000,      0.003),
  ('Yakult (80ml bottle)',      'Beverages',      'pcs',   120,    40,      8.50),
  ('Nata de Coco',             'Fruits & Fresh', 'g',    1000,   300,      0.05),
  ('Rainbow Jelly',            'Fruits & Fresh', 'g',    1000,   300,      0.04),
  ('Mango Sticky Rice Mix',    'Food',           'g',    2000,   500,      0.20),
  ('Puto Mix',                 'Food',           'g',    1500,   400,      0.18),
  ('Sikwate (tablea)',          'Food',           'pcs',   80,    20,       4.50),
  ('Buldak Carbonara Pasta',   'Food',           'g',    3000,  1000,      0.22),
  ('Velvet Blush Syrup',       'Syrups',         'ml',    800,   250,      0.19)
) AS item(name, cat, unit, stock, reorder, cost);

-- ─── Products ────────────────────────────────────────────────────────────────

WITH pc AS (SELECT id, name FROM product_categories)

INSERT INTO products (name, category_id, description, sort_order)
SELECT
  p.name,
  (SELECT id FROM pc WHERE name = p.cat),
  p.desc,
  p.ord
FROM (VALUES
  ('Spanish Latte',          'Iced Coffee',  'Classic espresso with sweet condensed milk. A bestseller.', 1),
  ('Biscoff Latte',          'Iced Coffee',  'Espresso with creamy Biscoff spread and cookie crumbles.',  2),
  ('Mocha',                  'Iced Coffee',  'Rich espresso blended with chocolate powder.',               3),
  ('Dripnado Frappe',        'Iced Coffee',  'Blended iced coffee frappe, thick and creamy.',             4),
  ('Caramel Macchiato',      'Iced Coffee',  'Espresso shots layered with caramel syrup.',                5),
  ('Cookie Butter',          'Milk Series',  'Biscoff-flavored milk drink, sweet and indulgent.',         6),
  ('Choco Berry',            'Milk Series',  'Chocolate and blueberry milk blend.',                       7),
  ('Matcha',                 'Milk Series',  'Japanese matcha with fresh milk.',                          8),
  ('Velvet Blush',           'Milk Series',  'Strawberry-tinted milk with a velvety finish.',             9),
  ('Mango Milk',             'Milk Series',  'Fresh mango puree with chilled milk.',                     10),
  ('Blueberry Milk',         'Milk Series',  'Blueberry jam swirled into cold fresh milk.',              11),
  ('Coke Float',             'Fruity Soda',  'Cold Coke topped with soft-serve ice cream.',              12),
  ('Green Apple Soda',       'Fruity Soda',  'Refreshing green apple soda with fresh lemon.',            13),
  ('Lychee Soda',            'Fruity Soda',  'Sweet lychee soda, perfect for hot days.',                 14),
  ('Mango Sticky Rice',      'Food',         'Classic Thai mango sticky rice with coconut cream.',       15),
  ('Puto & Sikwate',         'Food',         'Steamed puto paired with rich Cebuano sikwate.',           16),
  ('Cheesy Buldak Carbonara','Food',         'Spicy buldak carbonara pasta topped with cheese.',         17)
) AS p(name, cat, desc, ord);

-- ─── Product Variants (with prices) ──────────────────────────────────────────

WITH prods AS (SELECT id, name FROM products)

INSERT INTO product_variants (product_id, size_label, price, sort_order)
SELECT p.id, v.size_label, v.price, v.ord
FROM prods p
CROSS JOIN LATERAL (VALUES
  -- Iced Coffee — 16oz / 22oz
  ('Spanish Latte',          '16oz', 85.00, 1),
  ('Spanish Latte',          '22oz', 99.00, 2),
  ('Biscoff Latte',          '16oz', 99.00, 1),
  ('Biscoff Latte',          '22oz', 115.00, 2),
  ('Mocha',                  '16oz', 79.00, 1),
  ('Mocha',                  '22oz', 93.00, 2),
  ('Dripnado Frappe',        '16oz', 89.00, 1),
  ('Dripnado Frappe',        '22oz', 105.00, 2),
  ('Caramel Macchiato',      '16oz', 89.00, 1),
  ('Caramel Macchiato',      '22oz', 105.00, 2),
  -- Milk Series — 16oz / 22oz
  ('Cookie Butter',          '16oz', 75.00, 1),
  ('Cookie Butter',          '22oz', 89.00, 2),
  ('Choco Berry',            '16oz', 70.00, 1),
  ('Choco Berry',            '22oz', 85.00, 2),
  ('Matcha',                 '16oz', 65.00, 1),
  ('Matcha',                 '22oz', 79.00, 2),
  ('Velvet Blush',           '16oz', 60.00, 1),
  ('Velvet Blush',           '22oz', 75.00, 2),
  ('Mango Milk',             '16oz', 55.00, 1),
  ('Mango Milk',             '22oz', 69.00, 2),
  ('Blueberry Milk',         '16oz', 55.00, 1),
  ('Blueberry Milk',         '22oz', 69.00, 2),
  -- Fruity Soda — single size
  ('Coke Float',             'Regular', 39.00, 1),
  ('Green Apple Soda',       'Regular', 29.00, 1),
  ('Lychee Soda',            'Regular', 29.00, 1),
  -- Food — single size
  ('Mango Sticky Rice',      'Regular', 49.00, 1),
  ('Puto & Sikwate',         'Regular', 50.00, 1),
  ('Cheesy Buldak Carbonara','Regular', 135.00, 1)
) AS v(product_name, size_label, price, ord)
WHERE p.name = v.product_name;

-- ─── Recipes (BOM) ───────────────────────────────────────────────────────────
-- Realistic quantities per drink (grams/ml per serve, no fractions in real life)

WITH
  pv AS (
    SELECT pv.id, p.name AS product_name, pv.size_label
    FROM   product_variants pv
    JOIN   products p ON p.id = pv.product_id
  ),
  ii AS (SELECT id, name FROM inventory_items)

INSERT INTO recipe_items (variant_id, inventory_item_id, qty_per_sale)
SELECT
  pv.id,
  (SELECT id FROM ii WHERE name = r.item),
  CASE pv.size_label
    WHEN '22oz' THEN r.qty_16oz * 1.3     -- 22oz uses ~30% more
    ELSE              r.qty_16oz
  END
FROM pv
JOIN (VALUES
  -- (product, item, qty_for_16oz / Regular)
  ('Spanish Latte',    'Espresso Shots',       30),
  ('Spanish Latte',    'Condensed Milk',       60),
  ('Spanish Latte',    'Fresh Milk',           180),
  ('Spanish Latte',    'Spanish Latte Syrup',  20),
  ('Spanish Latte',    'Ice',                  200),
  ('Spanish Latte',    'Plastic Cup 16oz',     1),   -- overridden to 22oz cup below
  ('Spanish Latte',    'Boba Straw 23cm',      1),
  ('Spanish Latte',    'Plastic Lid',          1),

  ('Biscoff Latte',    'Espresso Shots',       30),
  ('Biscoff Latte',    'Condensed Milk',       50),
  ('Biscoff Latte',    'Fresh Milk',           170),
  ('Biscoff Latte',    'Biscoff Spread/Crumbs', 25),
  ('Biscoff Latte',    'Ice',                  200),
  ('Biscoff Latte',    'Plastic Cup 16oz',     1),
  ('Biscoff Latte',    'Boba Straw 23cm',      1),
  ('Biscoff Latte',    'Plastic Lid',          1),

  ('Mocha',            'Espresso Shots',       30),
  ('Mocha',            'Condensed Milk',       50),
  ('Mocha',            'Fresh Milk',           180),
  ('Mocha',            'Chocolate Powder',     20),
  ('Mocha',            'Ice',                  200),
  ('Mocha',            'Plastic Cup 16oz',     1),
  ('Mocha',            'Boba Straw 23cm',      1),
  ('Mocha',            'Plastic Lid',          1),

  ('Dripnado Frappe',  'Espresso Shots',       30),
  ('Dripnado Frappe',  'Condensed Milk',       50),
  ('Dripnado Frappe',  'All-Purpose Cream',    80),
  ('Dripnado Frappe',  'Ice',                  250),
  ('Dripnado Frappe',  'Plastic Cup 16oz',     1),
  ('Dripnado Frappe',  'Boba Straw 23cm',      1),
  ('Dripnado Frappe',  'Plastic Lid',          1),

  ('Caramel Macchiato','Espresso Shots',       30),
  ('Caramel Macchiato','Condensed Milk',       50),
  ('Caramel Macchiato','Fresh Milk',           180),
  ('Caramel Macchiato','Caramel Syrup',        20),
  ('Caramel Macchiato','Ice',                  200),
  ('Caramel Macchiato','Plastic Cup 16oz',     1),
  ('Caramel Macchiato','Boba Straw 23cm',      1),
  ('Caramel Macchiato','Plastic Lid',          1),

  ('Cookie Butter',    'Biscoff Spread/Crumbs', 30),
  ('Cookie Butter',    'Condensed Milk',       60),
  ('Cookie Butter',    'Fresh Milk',           200),
  ('Cookie Butter',    'Ice',                  200),
  ('Cookie Butter',    'Plastic Cup 16oz',     1),
  ('Cookie Butter',    'Boba Straw 23cm',      1),
  ('Cookie Butter',    'Plastic Lid',          1),

  ('Choco Berry',      'Chocolate Powder',     20),
  ('Choco Berry',      'Blueberry Jam',        30),
  ('Choco Berry',      'Condensed Milk',       60),
  ('Choco Berry',      'Fresh Milk',           190),
  ('Choco Berry',      'Ice',                  200),
  ('Choco Berry',      'Plastic Cup 16oz',     1),
  ('Choco Berry',      'Boba Straw 23cm',      1),
  ('Choco Berry',      'Plastic Lid',          1),

  ('Matcha',           'Matcha Powder',        15),
  ('Matcha',           'Condensed Milk',       60),
  ('Matcha',           'Fresh Milk',           200),
  ('Matcha',           'Ice',                  200),
  ('Matcha',           'Plastic Cup 16oz',     1),
  ('Matcha',           'Boba Straw 23cm',      1),
  ('Matcha',           'Plastic Lid',          1),

  ('Velvet Blush',     'Velvet Blush Syrup',   25),
  ('Velvet Blush',     'Condensed Milk',       50),
  ('Velvet Blush',     'Fresh Milk',           200),
  ('Velvet Blush',     'Ice',                  200),
  ('Velvet Blush',     'Plastic Cup 16oz',     1),
  ('Velvet Blush',     'Boba Straw 23cm',      1),
  ('Velvet Blush',     'Plastic Lid',          1),

  ('Mango Milk',       'Mango Puree',          80),
  ('Mango Milk',       'Condensed Milk',       40),
  ('Mango Milk',       'Fresh Milk',           160),
  ('Mango Milk',       'Ice',                  200),
  ('Mango Milk',       'Plastic Cup 16oz',     1),
  ('Mango Milk',       'Boba Straw 23cm',      1),
  ('Mango Milk',       'Plastic Lid',          1),

  ('Blueberry Milk',   'Blueberry Jam',        50),
  ('Blueberry Milk',   'Condensed Milk',       40),
  ('Blueberry Milk',   'Fresh Milk',           170),
  ('Blueberry Milk',   'Ice',                  200),
  ('Blueberry Milk',   'Plastic Cup 16oz',     1),
  ('Blueberry Milk',   'Boba Straw 23cm',      1),
  ('Blueberry Milk',   'Plastic Lid',          1),

  -- Fruity Sodas (Regular = single size)
  ('Coke Float',       'Coke (330ml can)',     1),
  ('Coke Float',       'Ice',                  100),
  ('Coke Float',       'Plastic Cup 16oz',     1),
  ('Coke Float',       'Boba Straw 23cm',      1),
  ('Coke Float',       'Plastic Lid',          1),

  ('Green Apple Soda', 'Green Apple Soda Syrup', 40),
  ('Green Apple Soda', 'Ice',                  200),
  ('Green Apple Soda', 'Plastic Cup 16oz',     1),
  ('Green Apple Soda', 'Boba Straw 23cm',      1),
  ('Green Apple Soda', 'Plastic Lid',          1),

  ('Lychee Soda',      'Lychee Syrup',         40),
  ('Lychee Soda',      'Ice',                  200),
  ('Lychee Soda',      'Plastic Cup 16oz',     1),
  ('Lychee Soda',      'Boba Straw 23cm',      1),
  ('Lychee Soda',      'Plastic Lid',          1),

  -- Food
  ('Mango Sticky Rice','Mango Sticky Rice Mix', 100),
  ('Puto & Sikwate',   'Puto Mix',             80),
  ('Puto & Sikwate',   'Sikwate (tablea)',      2),
  ('Cheesy Buldak Carbonara', 'Buldak Carbonara Pasta', 100)
) AS r(product_name, item, qty_16oz)
ON pv.product_name = r.product_name
-- 22oz cup override: replace 16oz cup with 22oz cup
WHERE NOT (pv.size_label = '22oz' AND r.item = 'Plastic Cup 16oz');

-- Correct: 22oz variants get 22oz cup
WITH
  pv AS (
    SELECT pv.id, p.name AS product_name, pv.size_label
    FROM   product_variants pv
    JOIN   products p ON p.id = pv.product_id
    WHERE  pv.size_label = '22oz'
  ),
  cup AS (SELECT id FROM inventory_items WHERE name = 'Plastic Cup 22oz')
INSERT INTO recipe_items (variant_id, inventory_item_id, qty_per_sale)
SELECT pv.id, cup.id, 1
FROM   pv, cup
WHERE  pv.product_name IN (
  'Spanish Latte','Biscoff Latte','Mocha','Dripnado Frappe','Caramel Macchiato',
  'Cookie Butter','Choco Berry','Matcha','Velvet Blush','Mango Milk','Blueberry Milk'
)
ON CONFLICT (variant_id, inventory_item_id) DO NOTHING;

-- ─── Add-Ons ─────────────────────────────────────────────────────────────────

INSERT INTO add_ons (name, price, sort_order) VALUES
  ('Yakult',        15.00, 1),
  ('Nata de Coco',  10.00, 2),
  ('Rainbow Jelly', 10.00, 3),
  ('Coffee Jelly',  15.00, 4),
  ('Extra Syrup',   10.00, 5)
ON CONFLICT (name) DO NOTHING;

-- Yakult add-on recipe: deducts 1 bottle of Yakult
WITH
  ao AS (SELECT id FROM add_ons WHERE name = 'Yakult'),
  ii AS (SELECT id FROM inventory_items WHERE name = 'Yakult (80ml bottle)')
INSERT INTO add_on_recipe_items (add_on_id, inventory_item_id, qty_per_sale)
SELECT ao.id, ii.id, 1 FROM ao, ii;

-- Nata de Coco add-on recipe
WITH
  ao AS (SELECT id FROM add_ons WHERE name = 'Nata de Coco'),
  ii AS (SELECT id FROM inventory_items WHERE name = 'Nata de Coco')
INSERT INTO add_on_recipe_items (add_on_id, inventory_item_id, qty_per_sale)
SELECT ao.id, ii.id, 30 FROM ao, ii;

-- Rainbow Jelly add-on recipe
WITH
  ao AS (SELECT id FROM add_ons WHERE name = 'Rainbow Jelly'),
  ii AS (SELECT id FROM inventory_items WHERE name = 'Rainbow Jelly')
INSERT INTO add_on_recipe_items (add_on_id, inventory_item_id, qty_per_sale)
SELECT ao.id, ii.id, 30 FROM ao, ii;

-- ─── Sample Assets ────────────────────────────────────────────────────────────

INSERT INTO assets (name, purchase_price, purchase_date, note) VALUES
  ('Counter Table',          4700.00, '2026-03-01', 'Main serving counter'),
  ('Vermax 2-in-1 Frother',   329.00, '2026-02-13', 'Milk frother and blender'),
  ('Knock Box Coffee Bar',    299.00, '2026-02-11', 'Espresso knock box'),
  ('Moka Pot 300ml',          500.00, '2026-02-11', 'Italian moka pot for espresso'),
  ('Android Tablet (POS)',   5499.00, '2026-03-10', '10-inch tablet for POS system'),
  ('Portable Printer',       2800.00, '2026-03-10', '58mm thermal receipt printer');

-- ─── Done! ────────────────────────────────────────────────────────────────────
-- After seeding:
--   1. Create your first manager account in Supabase Auth Dashboard
--   2. Run: UPDATE profiles SET cafe_role = 'manager' WHERE id = '<your-uid>';
--   3. Sign in at /login with your credentials
