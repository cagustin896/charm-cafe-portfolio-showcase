// ─── Seed Data ────────────────────────────────────────────────────────────────
// Mirrors supabase/migrations/20260611000004_seed.sql so the localStorage
// adapter and the (future) Supabase backend start from identical demo data.
// IDs are deterministic slugs so recipes/orders can reference them reliably.

import type {
  Profile, CafeSettings, ProductCategory, InventoryCategory, Unit,
  InventoryItem, Product, ProductVariant, RecipeItem, AddOn, Asset,
} from '@/types';
import {
  writeCollection, writeSingleton, isSeeded, markSeeded, nowIso,
} from '@/services/storage';
import { DEMO_MODE, type LocalAccount } from '@/services/authService';

const T = nowIso();

// ─── Settings ────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: CafeSettings = {
  business_name: 'Charm Cafe',
  tagline: 'A little charm in every cup',
  logo_url: null,
  receipt_footer: 'Salamat, see you again!',
  currency: 'PHP',
  timezone: 'Asia/Manila',
  address: 'Cebu, Philippines',
  contact: '',
  vat_enabled: false,
  vat_tin: null,
  vat_rate: 12,
  or_prefix: 'ORD',
  or_current: 0,
};

// ─── Profiles & Accounts ─────────────────────────────────────────────────────

const managerProfile: Profile = {
  id: 'profile-manager',
  full_name: 'Christian Agustin',
  cafe_role: 'manager',
  can_view_inventory: true,
  can_add_expenses: true,
  is_active: true,
  daily_rate: null,
  hourly_rate: null,
  pin_code: '1234',
  created_at: T,
  updated_at: T,
};

// Sample staff member — only seeded on the public demo so recruiters can try
// the staff-role view. Production starts with just the manager; real staff are
// created from inside the app (Staff → Add Staff).
const staffProfile: Profile = {
  id: 'profile-staff-1',
  full_name: 'Maria Santos',
  cafe_role: 'staff',
  can_view_inventory: true,
  can_add_expenses: false,
  is_active: true,
  daily_rate: 450,
  hourly_rate: null,
  pin_code: '2580',
  created_at: T,
  updated_at: T,
};

const profiles: Profile[] = DEMO_MODE ? [managerProfile, staffProfile] : [managerProfile];

const accounts: LocalAccount[] = [
  // Documented demo credentials. Outside demo mode, first sign-in forces the
  // owner to replace them with their own username + password.
  { profile_id: 'profile-manager', username: 'manager', password: 'charm2026', must_change_credentials: true },
  ...(DEMO_MODE
    ? [{ profile_id: 'profile-staff-1', username: 'staff', password: 'staff2026', must_change_credentials: true } as LocalAccount]
    : []),
];

// ─── Categories & Units ──────────────────────────────────────────────────────

const productCategories: ProductCategory[] = [
  { id: 'pcat-milk-series', name: 'Milk Series', sort_order: 1, is_active: true, created_at: T },
  { id: 'pcat-iced-coffee', name: 'Iced Coffee', sort_order: 2, is_active: true, created_at: T },
  { id: 'pcat-fruity-soda', name: 'Fruity Soda', sort_order: 3, is_active: true, created_at: T },
  { id: 'pcat-food', name: 'Food', sort_order: 4, is_active: true, created_at: T },
];

const inventoryCategories: InventoryCategory[] = [
  { id: 'icat-coffee-base', name: 'Coffee Base', sort_order: 1, is_active: true, created_at: T },
  { id: 'icat-milk-cream', name: 'Milk & Cream', sort_order: 2, is_active: true, created_at: T },
  { id: 'icat-syrups', name: 'Syrups', sort_order: 3, is_active: true, created_at: T },
  { id: 'icat-powders', name: 'Powders', sort_order: 4, is_active: true, created_at: T },
  { id: 'icat-fruits', name: 'Fruits & Fresh', sort_order: 5, is_active: true, created_at: T },
  { id: 'icat-packaging', name: 'Packaging', sort_order: 6, is_active: true, created_at: T },
  { id: 'icat-food', name: 'Food', sort_order: 7, is_active: true, created_at: T },
  { id: 'icat-beverages', name: 'Beverages', sort_order: 8, is_active: true, created_at: T },
];

const units: Unit[] = [
  { id: 'unit-ml', name: 'ml', sort_order: 1 },
  { id: 'unit-g', name: 'g', sort_order: 2 },
  { id: 'unit-pcs', name: 'pcs', sort_order: 3 },
  { id: 'unit-tbsp', name: 'tbsp', sort_order: 4 },
  { id: 'unit-tsp', name: 'tsp', sort_order: 5 },
  { id: 'unit-l', name: 'L', sort_order: 6 },
];

// ─── Inventory Items ─────────────────────────────────────────────────────────

type InvRow = [id: string, name: string, cat: string, unit: string, stock: number, low: number, cost: number];

const invRows: InvRow[] = [
  ['inv-espresso', 'Espresso Shots', 'icat-coffee-base', 'unit-ml', 800, 200, 0.25],
  ['inv-condensed', 'Condensed Milk', 'icat-milk-cream', 'unit-g', 5000, 2000, 0.10],
  ['inv-fresh-milk', 'Fresh Milk', 'icat-milk-cream', 'unit-ml', 4000, 1500, 0.08],
  ['inv-apc', 'All-Purpose Cream', 'icat-milk-cream', 'unit-ml', 2000, 800, 0.18],
  ['inv-spanish-syrup', 'Spanish Latte Syrup', 'icat-syrups', 'unit-ml', 1200, 400, 0.22],
  ['inv-caramel-syrup', 'Caramel Syrup', 'icat-syrups', 'unit-ml', 800, 300, 0.20],
  ['inv-biscoff', 'Biscoff Spread/Crumbs', 'icat-powders', 'unit-g', 1000, 300, 0.60],
  ['inv-choco-powder', 'Chocolate Powder', 'icat-powders', 'unit-g', 800, 300, 0.43],
  ['inv-matcha-powder', 'Matcha Powder', 'icat-powders', 'unit-g', 500, 150, 1.20],
  ['inv-blueberry-jam', 'Blueberry Jam', 'icat-fruits', 'unit-g', 2000, 500, 0.15],
  ['inv-mango-puree', 'Mango Puree', 'icat-fruits', 'unit-ml', 1500, 500, 0.18],
  ['inv-coke', 'Coke (330ml can)', 'icat-beverages', 'unit-pcs', 48, 20, 17.00],
  ['inv-green-apple', 'Green Apple Soda Syrup', 'icat-syrups', 'unit-ml', 1000, 300, 0.16],
  ['inv-lychee', 'Lychee Syrup', 'icat-syrups', 'unit-ml', 1000, 300, 0.16],
  ['inv-cup-16', 'Plastic Cup 16oz', 'icat-packaging', 'unit-pcs', 200, 100, 2.20],
  ['inv-cup-22', 'Plastic Cup 22oz', 'icat-packaging', 'unit-pcs', 200, 100, 2.50],
  ['inv-straw', 'Boba Straw 23cm', 'icat-packaging', 'unit-pcs', 300, 80, 0.85],
  ['inv-lid', 'Plastic Lid', 'icat-packaging', 'unit-pcs', 400, 100, 0.60],
  ['inv-ice', 'Ice', 'icat-beverages', 'unit-g', 10000, 3000, 0.003],
  ['inv-yakult', 'Yakult (80ml bottle)', 'icat-beverages', 'unit-pcs', 120, 40, 8.50],
  ['inv-nata', 'Nata de Coco', 'icat-fruits', 'unit-g', 1000, 300, 0.05],
  ['inv-jelly', 'Rainbow Jelly', 'icat-fruits', 'unit-g', 1000, 300, 0.04],
  ['inv-mango-rice', 'Mango Sticky Rice Mix', 'icat-food', 'unit-g', 2000, 500, 0.20],
  ['inv-puto', 'Puto Mix', 'icat-food', 'unit-g', 1500, 400, 0.18],
  ['inv-sikwate', 'Sikwate (tablea)', 'icat-food', 'unit-pcs', 80, 20, 4.50],
  ['inv-buldak', 'Buldak Carbonara Pasta', 'icat-food', 'unit-g', 3000, 1000, 0.22],
  ['inv-velvet', 'Velvet Blush Syrup', 'icat-syrups', 'unit-ml', 800, 250, 0.19],
];

const inventoryItems: InventoryItem[] = invRows.map(([id, name, cat, unit, stock, low, cost]) => ({
  id,
  name,
  category_id: cat,
  unit_id: unit,
  current_stock: stock,
  low_stock_threshold: low,
  unit_cost: cost,
  is_active: true,
  created_at: T,
  updated_at: T,
}));

// ─── Products, Variants & Recipes ─────────────────────────────────────────────
// recipe entries are [inventory_item_id, qty for 16oz/Regular].
// Drinks with two sizes get a 22oz variant at 1.3× ingredient quantities,
// with the 16oz cup swapped for the 22oz cup.

interface ProductDef {
  id: string;
  name: string;
  cat: string;
  desc: string;
  sizes: { label: string; price: number }[];
  recipe: [string, number][];
}

const DRINK_PACKAGING: [string, number][] = [
  ['inv-cup-16', 1],
  ['inv-straw', 1],
  ['inv-lid', 1],
];

const productDefs: ProductDef[] = [
  {
    id: 'prod-spanish-latte', name: 'Spanish Latte', cat: 'pcat-iced-coffee',
    desc: 'Classic espresso with sweet condensed milk. A bestseller.',
    sizes: [{ label: '16oz', price: 85 }, { label: '22oz', price: 99 }],
    recipe: [['inv-espresso', 30], ['inv-condensed', 60], ['inv-fresh-milk', 180], ['inv-spanish-syrup', 20], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-biscoff-latte', name: 'Biscoff Latte', cat: 'pcat-iced-coffee',
    desc: 'Espresso with creamy Biscoff spread and cookie crumbles.',
    sizes: [{ label: '16oz', price: 99 }, { label: '22oz', price: 115 }],
    recipe: [['inv-espresso', 30], ['inv-condensed', 50], ['inv-fresh-milk', 170], ['inv-biscoff', 25], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-mocha', name: 'Mocha', cat: 'pcat-iced-coffee',
    desc: 'Rich espresso blended with chocolate powder.',
    sizes: [{ label: '16oz', price: 79 }, { label: '22oz', price: 93 }],
    recipe: [['inv-espresso', 30], ['inv-condensed', 50], ['inv-fresh-milk', 180], ['inv-choco-powder', 20], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-dripnado', name: 'Dripnado Frappe', cat: 'pcat-iced-coffee',
    desc: 'Blended iced coffee frappe, thick and creamy.',
    sizes: [{ label: '16oz', price: 89 }, { label: '22oz', price: 105 }],
    recipe: [['inv-espresso', 30], ['inv-condensed', 50], ['inv-apc', 80], ['inv-ice', 250], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-caramel-macchiato', name: 'Caramel Macchiato', cat: 'pcat-iced-coffee',
    desc: 'Espresso shots layered with caramel syrup.',
    sizes: [{ label: '16oz', price: 89 }, { label: '22oz', price: 105 }],
    recipe: [['inv-espresso', 30], ['inv-condensed', 50], ['inv-fresh-milk', 180], ['inv-caramel-syrup', 20], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-cookie-butter', name: 'Cookie Butter', cat: 'pcat-milk-series',
    desc: 'Biscoff-flavored milk drink, sweet and indulgent.',
    sizes: [{ label: '16oz', price: 75 }, { label: '22oz', price: 89 }],
    recipe: [['inv-biscoff', 30], ['inv-condensed', 60], ['inv-fresh-milk', 200], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-choco-berry', name: 'Choco Berry', cat: 'pcat-milk-series',
    desc: 'Chocolate and blueberry milk blend.',
    sizes: [{ label: '16oz', price: 70 }, { label: '22oz', price: 85 }],
    recipe: [['inv-choco-powder', 20], ['inv-blueberry-jam', 30], ['inv-condensed', 60], ['inv-fresh-milk', 190], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-matcha', name: 'Matcha', cat: 'pcat-milk-series',
    desc: 'Japanese matcha with fresh milk.',
    sizes: [{ label: '16oz', price: 65 }, { label: '22oz', price: 79 }],
    recipe: [['inv-matcha-powder', 15], ['inv-condensed', 60], ['inv-fresh-milk', 200], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-velvet-blush', name: 'Velvet Blush', cat: 'pcat-milk-series',
    desc: 'Strawberry-tinted milk with a velvety finish.',
    sizes: [{ label: '16oz', price: 60 }, { label: '22oz', price: 75 }],
    recipe: [['inv-velvet', 25], ['inv-condensed', 50], ['inv-fresh-milk', 200], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-mango-milk', name: 'Mango Milk', cat: 'pcat-milk-series',
    desc: 'Fresh mango puree with chilled milk.',
    sizes: [{ label: '16oz', price: 55 }, { label: '22oz', price: 69 }],
    recipe: [['inv-mango-puree', 80], ['inv-condensed', 40], ['inv-fresh-milk', 160], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-blueberry-milk', name: 'Blueberry Milk', cat: 'pcat-milk-series',
    desc: 'Blueberry jam swirled into cold fresh milk.',
    sizes: [{ label: '16oz', price: 55 }, { label: '22oz', price: 69 }],
    recipe: [['inv-blueberry-jam', 50], ['inv-condensed', 40], ['inv-fresh-milk', 170], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-coke-float', name: 'Coke Float', cat: 'pcat-fruity-soda',
    desc: 'Cold Coke topped with soft-serve ice cream.',
    sizes: [{ label: 'Regular', price: 39 }],
    recipe: [['inv-coke', 1], ['inv-ice', 100], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-green-apple-soda', name: 'Green Apple Soda', cat: 'pcat-fruity-soda',
    desc: 'Refreshing green apple soda, perfect for hot days.',
    sizes: [{ label: 'Regular', price: 29 }],
    recipe: [['inv-green-apple', 40], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-lychee-soda', name: 'Lychee Soda', cat: 'pcat-fruity-soda',
    desc: 'Sweet lychee soda, light and refreshing.',
    sizes: [{ label: 'Regular', price: 29 }],
    recipe: [['inv-lychee', 40], ['inv-ice', 200], ...DRINK_PACKAGING],
  },
  {
    id: 'prod-mango-sticky-rice', name: 'Mango Sticky Rice', cat: 'pcat-food',
    desc: 'Classic Thai mango sticky rice with coconut cream.',
    sizes: [{ label: 'Regular', price: 49 }],
    recipe: [['inv-mango-rice', 100]],
  },
  {
    id: 'prod-puto-sikwate', name: 'Puto & Sikwate', cat: 'pcat-food',
    desc: 'Steamed puto paired with rich Cebuano sikwate.',
    sizes: [{ label: 'Regular', price: 50 }],
    recipe: [['inv-puto', 80], ['inv-sikwate', 2]],
  },
  {
    id: 'prod-buldak-carbonara', name: 'Cheesy Buldak Carbonara', cat: 'pcat-food',
    desc: 'Spicy buldak carbonara pasta topped with cheese.',
    sizes: [{ label: 'Regular', price: 135 }],
    recipe: [['inv-buldak', 100]],
  },
];

const SIZE_22_MULTIPLIER = 1.3;

function buildRecipe(def: ProductDef, variantId: string, sizeLabel: string): RecipeItem[] {
  return def.recipe.map(([itemId, qty16]) => {
    let itemIdFinal = itemId;
    let qty = qty16;
    if (sizeLabel === '22oz') {
      if (itemId === 'inv-cup-16') {
        itemIdFinal = 'inv-cup-22';
        // cups stay at 1 each
      } else if (itemId !== 'inv-straw' && itemId !== 'inv-lid') {
        qty = Math.round(qty16 * SIZE_22_MULTIPLIER * 100) / 100;
      }
    }
    return {
      id: `${variantId}::${itemIdFinal}`,
      variant_id: variantId,
      inventory_item_id: itemIdFinal,
      qty_per_sale: qty,
    };
  });
}

const products: Product[] = productDefs.map((def, i) => ({
  id: def.id,
  name: def.name,
  category_id: def.cat,
  image_url: null,
  description: def.desc,
  is_available: true,
  sort_order: i + 1,
  created_at: T,
  updated_at: T,
  variants: def.sizes.map((size, j): ProductVariant => {
    const variantId = `${def.id}::${size.label}`;
    return {
      id: variantId,
      product_id: def.id,
      size_label: size.label,
      price: size.price,
      sort_order: j + 1,
      is_active: true,
      recipe_items: buildRecipe(def, variantId, size.label),
    };
  }),
}));

// ─── Add-Ons ─────────────────────────────────────────────────────────────────

const addOns: AddOn[] = [
  {
    id: 'addon-yakult', name: 'Yakult', price: 15, is_active: true, sort_order: 1, created_at: T,
    recipe_items: [{ id: 'addon-yakult::inv-yakult', add_on_id: 'addon-yakult', inventory_item_id: 'inv-yakult', qty_per_sale: 1 }],
  },
  {
    id: 'addon-nata', name: 'Nata de Coco', price: 10, is_active: true, sort_order: 2, created_at: T,
    recipe_items: [{ id: 'addon-nata::inv-nata', add_on_id: 'addon-nata', inventory_item_id: 'inv-nata', qty_per_sale: 30 }],
  },
  {
    id: 'addon-jelly', name: 'Rainbow Jelly', price: 10, is_active: true, sort_order: 3, created_at: T,
    recipe_items: [{ id: 'addon-jelly::inv-jelly', add_on_id: 'addon-jelly', inventory_item_id: 'inv-jelly', qty_per_sale: 30 }],
  },
  {
    id: 'addon-extra-espresso', name: 'Extra Espresso Shot', price: 15, is_active: true, sort_order: 4, created_at: T,
    recipe_items: [{ id: 'addon-extra-espresso::inv-espresso', add_on_id: 'addon-extra-espresso', inventory_item_id: 'inv-espresso', qty_per_sale: 30 }],
  },
];

// ─── Assets ──────────────────────────────────────────────────────────────────

const assets: Asset[] = [
  { id: 'asset-counter', name: 'Counter Table', purchase_price: 4700, purchase_date: '2026-03-01', note: 'Main serving counter', is_active: true, created_at: T },
  { id: 'asset-frother', name: 'Vermax 2-in-1 Frother', purchase_price: 329, purchase_date: '2026-02-13', note: 'Milk frother and blender', is_active: true, created_at: T },
  { id: 'asset-knockbox', name: 'Knock Box Coffee Bar', purchase_price: 299, purchase_date: '2026-02-11', note: 'Espresso knock box', is_active: true, created_at: T },
  { id: 'asset-mokapot', name: 'Moka Pot 300ml', purchase_price: 500, purchase_date: '2026-02-11', note: 'Italian moka pot for espresso', is_active: true, created_at: T },
  { id: 'asset-tablet', name: 'Android Tablet (POS)', purchase_price: 5499, purchase_date: '2026-03-10', note: '10-inch tablet for POS system', is_active: true, created_at: T },
  { id: 'asset-printer', name: 'Portable Printer', purchase_price: 2800, purchase_date: '2026-03-10', note: '58mm thermal receipt printer', is_active: true, created_at: T },
];

// ─── Seed Runner ─────────────────────────────────────────────────────────────

export function seedIfNeeded(): void {
  if (isSeeded()) return;

  writeSingleton(DEFAULT_SETTINGS);
  writeCollection('profiles', profiles);
  writeCollection('accounts', accounts);
  writeCollection('product_categories', productCategories);
  writeCollection('inventory_categories', inventoryCategories);
  writeCollection('units', units);
  writeCollection('inventory_items', inventoryItems);
  writeCollection('products', products);
  writeCollection('add_ons', addOns);
  writeCollection('stock_movements', []);
  writeCollection('orders', []);
  writeCollection('purchases', []);
  writeCollection('expenses', []);
  writeCollection('assets', assets);
  writeCollection('time_logs', []);
  writeCollection('payroll_periods', []);

  markSeeded();
}
