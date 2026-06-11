// ─── Showcase Activity Seed ───────────────────────────────────────────────────
// Populates the PUBLIC DEMO with realistic operating data — ~2 weeks of sales,
// expenses, staff time logs, a payroll period, low-stock alerts, and a movement
// ledger — so dashboards, analytics, and history look real for review and
// screenshots. Runs only in demo mode and only on a fresh seed (a Settings
// reset sets a skip flag, leaving a clean slate). Never touches production.

import type {
  Product, AddOn, InventoryItem, StockMovement, Order, OrderItem, OrderItemAddOn,
  Expense, TimeLog, PayrollPeriod, PayrollEntry, Profile, CafeSettings,
} from '@/types';
import {
  readCollection, writeCollection, readSingleton, writeSingleton, uid,
} from '@/services/storage';

// Minimal fallback for readSingleton; real settings are already persisted when
// this runs, so these values are never actually used (kept here to avoid an
// import cycle with seed.ts).
const SETTINGS_FALLBACK = {
  business_name: 'Charm Cafe', tagline: '', logo_url: null, receipt_footer: '',
  currency: 'PHP', timezone: 'Asia/Manila', address: '', contact: '',
  vat_enabled: false, vat_tin: null, vat_rate: 12, or_prefix: 'ORD', or_current: 0,
} as CafeSettings;

// Deterministic RNG so the demo looks the same on every fresh load (stable shots)
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─── Manila-time helpers (UTC+8, no DST) ─────────────────────────────────────

function todayParts(): [number, number, number] {
  const now = new Date();
  const manila = new Date(now.getTime() + 8 * 3600000); // shift to Manila wall clock
  return [manila.getUTCFullYear(), manila.getUTCMonth() + 1, manila.getUTCDate()];
}

function dayParts(daysAgo: number): [number, number, number] {
  const [y, m, d] = todayParts();
  const dt = new Date(Date.UTC(y, m - 1, d - daysAgo));
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
}

/** ISO instant whose Manila wall-clock is y-m-d h:min. */
function manilaInstant(y: number, m: number, d: number, h: number, min: number): string {
  return new Date(Date.UTC(y, m - 1, d, h - 8, min, 0)).toISOString();
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Main ────────────────────────────────────────────────────────────────────

export function seedShowcaseActivity(): void {
  const rng = makeRng(20260612);

  const products = readCollection<Product>('products');
  const addOns = readCollection<AddOn>('add_ons').filter((a) => a.is_active);
  const inventory = readCollection<InventoryItem>('inventory_items');
  const profiles = readCollection<Profile>('profiles');
  const settings = readSingleton<CafeSettings>(SETTINGS_FALLBACK);

  const manager = profiles.find((p) => p.cafe_role === 'manager');
  const staff = profiles.find((p) => p.cafe_role === 'staff');
  if (!manager) return;

  // Weighted variant pool (bestsellers appear more often)
  const WEIGHTS: Record<string, number> = {
    'prod-spanish-latte': 10, 'prod-biscoff-latte': 9, 'prod-dripnado': 8, 'prod-mocha': 7,
    'prod-caramel-macchiato': 6, 'prod-cookie-butter': 6, 'prod-matcha': 5, 'prod-choco-berry': 4,
    'prod-mango-milk': 4, 'prod-velvet-blush': 3, 'prod-blueberry-milk': 3, 'prod-coke-float': 5,
    'prod-green-apple-soda': 3, 'prod-lychee-soda': 3, 'prod-mango-sticky-rice': 4,
    'prod-puto-sikwate': 3, 'prod-buldak-carbonara': 4,
  };
  const recipeByVariant = new Map(
    products.flatMap((p) => (p.variants ?? []).map((v) => [v.id, v.recipe_items ?? []] as const))
  );
  const catById = new Map(
    readCollection<{ id: string; name: string }>('product_categories').map((c) => [c.id, c.name])
  );
  const pool: { product: Product; variantId: string; price: number; size: string; isFood: boolean }[] = [];
  for (const p of products) {
    const w = WEIGHTS[p.id] ?? 3;
    const isFood = (p.category_id && catById.get(p.category_id)) === 'Food';
    for (const v of p.variants ?? []) {
      for (let i = 0; i < w; i++) pool.push({ product: p, variantId: v.id, price: v.price, size: v.size_label, isFood: !!isFood });
    }
  }
  const pick = () => pool[Math.floor(rng() * pool.length)];

  // ── Generate orders across the last 14 days ──
  const orders: Order[] = [];
  const movements: StockMovement[] = [];
  const deduct = new Map<string, number>();
  let orderSeq = 0;

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const [y, m, d] = dayParts(daysAgo);
    const isToday = daysAgo === 0;
    const weekendBoost = ([0, 6].includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())) ? 2 : 0;
    const count = isToday ? 3 + Math.floor(rng() * 3) : 3 + weekendBoost + Math.floor(rng() * 5);

    for (let i = 0; i < count; i++) {
      const hour = 8 + Math.floor(rng() * 12); // 8am–8pm
      const minute = Math.floor(rng() * 60);
      const createdAt = manilaInstant(y, m, d, hour, minute);
      orderSeq += 1;
      const orderId = uid();

      const nLines = 1 + (rng() < 0.55 ? 1 : 0) + (rng() < 0.2 ? 1 : 0);
      const items: OrderItem[] = [];
      for (let l = 0; l < nLines; l++) {
        const choice = pick();
        const qty = rng() < 0.78 ? 1 : 2;
        const itemId = uid();

        const lineAddOns: OrderItemAddOn[] = [];
        let addOnsTotal = 0;
        if (!choice.isFood && rng() < 0.22 && addOns.length) {
          const a = addOns[Math.floor(rng() * addOns.length)];
          lineAddOns.push({ id: uid(), order_item_id: itemId, add_on_id: a.id, add_on_name: a.name, price: a.price });
          addOnsTotal += a.price;
        }
        const unitPrice = choice.price + addOnsTotal;
        items.push({
          id: itemId, order_id: orderId, variant_id: choice.variantId,
          product_name: choice.product.name, size_label: choice.size,
          unit_price: unitPrice, quantity: qty, line_total: round2(unitPrice * qty),
          is_voided: false, void_reason: null, voided_by: null, voided_at: null, add_ons: lineAddOns,
        });

        // Accumulate stock deductions (variant recipe + add-on recipes) × qty
        for (const r of recipeByVariant.get(choice.variantId) ?? []) {
          deduct.set(r.inventory_item_id, (deduct.get(r.inventory_item_id) ?? 0) + r.qty_per_sale * qty);
        }
        for (const la of lineAddOns) {
          const ao = addOns.find((a) => a.id === la.add_on_id);
          for (const r of ao?.recipe_items ?? []) {
            deduct.set(r.inventory_item_id, (deduct.get(r.inventory_item_id) ?? 0) + r.qty_per_sale * qty);
          }
        }
      }

      const subtotal = round2(items.reduce((s, it) => s + it.line_total, 0));
      const senior = rng() < 0.12;
      const discountAmount = senior ? round2(subtotal * 0.2) : 0;
      const total = round2(subtotal - discountAmount);
      const isCash = rng() < 0.68;
      const tendered = isCash ? Math.ceil(total / 50) * 50 + (rng() < 0.3 ? 50 : 0) : null;
      const orderType = rng() < 0.45 ? 'dine-in' : 'take-out';
      const createdBy = staff && rng() < 0.4 ? staff.id : manager.id;

      orders.push({
        id: orderId, order_no: `${settings.or_prefix}-${String(orderSeq).padStart(4, '0')}`,
        order_type: orderType, payment_method: isCash ? 'cash' : 'gcash',
        cash_amount: isCash ? total : null, gcash_amount: isCash ? null : total,
        gcash_ref: isCash ? null : `GC${Math.floor(rng() * 1e9).toString().padStart(9, '0')}`,
        subtotal, discount_type_id: senior ? 'senior' : null,
        discount_type_name: senior ? 'Senior/PWD (20%)' : null, discount_amount: discountAmount,
        total, amount_tendered: tendered, change_due: tendered != null ? round2(tendered - total) : null,
        status: 'completed', void_reason: null, voided_by: null, voided_at: null,
        created_by: createdBy, created_at: createdAt, items,
      });

      // Sale movements for this order (the ledger)
      const orderDeduct = new Map<string, number>();
      for (const it of items) {
        for (const r of recipeByVariant.get(it.variant_id ?? '') ?? []) {
          orderDeduct.set(r.inventory_item_id, (orderDeduct.get(r.inventory_item_id) ?? 0) + r.qty_per_sale * it.quantity);
        }
      }
      for (const [invId, qty] of orderDeduct) {
        movements.push({
          id: uid(), inventory_item_id: invId, qty_change: -qty, movement_type: 'sale',
          reference_id: orderId, reference_type: 'order',
          note: `Sale ${settings.or_prefix}-${String(orderSeq).padStart(4, '0')}`,
          created_by: createdBy, created_at: createdAt,
        });
      }
    }
  }

  // ── Inventory: realistic levels + a few low for the alerts demo ──
  const LOW: Record<string, number> = {
    'inv-caramel-syrup': 250, 'inv-coke': 15, 'inv-biscoff': 280, 'inv-matcha-powder': 120,
  };
  const REDUCE: Record<string, number> = {
    'inv-espresso': 470, 'inv-fresh-milk': 2300, 'inv-condensed': 3100, 'inv-ice': 6200,
    'inv-cup-16': 130, 'inv-cup-22': 140, 'inv-straw': 190, 'inv-lid': 240,
  };
  const updatedInventory = inventory.map((it) => {
    if (it.id in LOW) return { ...it, current_stock: LOW[it.id] };
    if (it.id in REDUCE) return { ...it, current_stock: REDUCE[it.id] };
    return it;
  });

  // A couple of restocks + one waste, for ledger variety
  const [ry, rm, rd] = dayParts(9);
  movements.push({
    id: uid(), inventory_item_id: 'inv-fresh-milk', qty_change: 3000, movement_type: 'stock_in',
    reference_id: null, reference_type: 'purchase', note: 'Stock in from Metro Cebu Supplies',
    created_by: manager.id, created_at: manilaInstant(ry, rm, rd, 7, 30),
  });
  const [wy, wm, wd] = dayParts(5);
  movements.push({
    id: uid(), inventory_item_id: 'inv-fresh-milk', qty_change: -250, movement_type: 'waste',
    reference_id: null, reference_type: null, note: 'Spoiled — left out overnight',
    created_by: manager.id, created_at: manilaInstant(wy, wm, wd, 9, 0),
  });

  // ── Expenses across the period ──
  const expenses: Expense[] = ([
    [13, 'Rent', 8000, 'Monthly stall rent'],
    [12, 'Utilities', 3450, 'Meralco electricity'],
    [11, 'Inventory', 3200, 'Coffee beans + milk delivery'],
    [10, 'Supplies', 980, 'Cups, lids, straws'],
    [8, 'Marketing', 1500, 'Facebook boosted post'],
    [7, 'Inventory', 2650, 'Syrups + Biscoff restock'],
    [5, 'Maintenance', 650, 'Espresso machine cleaning'],
    [4, 'Utilities', 720, 'Water station refill'],
    [2, 'Inventory', 2100, 'Fresh milk + fruit puree'],
    [1, 'Supplies', 540, 'Tissue + cleaning supplies'],
  ] as const).map(([daysAgo, category, amount, note]) => {
    const [y, m, d] = dayParts(daysAgo);
    return {
      id: uid(), category, amount, note, expense_date: dateKey(y, m, d), receipt_url: null,
      created_by: manager.id, created_at: manilaInstant(y, m, d, 18, 0),
      updated_at: manilaInstant(y, m, d, 18, 0),
    } as Expense;
  });

  // ── Staff time logs (completed shifts) ──
  const timeLogs: TimeLog[] = [];
  const addShift = (profileId: string, daysAgo: number, inH: number, outH: number) => {
    const [y, m, d] = dayParts(daysAgo);
    const clockIn = manilaInstant(y, m, d, inH, 5 + Math.floor(rng() * 20));
    const clockOut = manilaInstant(y, m, d, outH, 10 + Math.floor(rng() * 40));
    const hours = round2((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000);
    timeLogs.push({
      id: uid(), profile_id: profileId, clock_in: clockIn, clock_out: clockOut,
      hours_worked: hours, adjustment_note: null, adjusted_by: null, created_at: clockIn,
    });
  };
  if (staff) {
    for (const dAgo of [13, 12, 10, 9, 7, 6, 4, 3, 1]) addShift(staff.id, dAgo, 8, 17);
  }
  for (const dAgo of [13, 11, 9, 6, 4, 2]) addShift(manager.id, dAgo, 7, 18);

  // ── One draft payroll period for the last 7 days ──
  const periodStart = (() => { const [y, m, d] = dayParts(7); return dateKey(y, m, d); })();
  const periodEnd = (() => { const [y, m, d] = dayParts(1); return dateKey(y, m, d); })();
  const payrollEntries: PayrollEntry[] = [];
  if (staff && staff.daily_rate != null) {
    const days = new Set(
      timeLogs
        .filter((l) => l.profile_id === staff.id && l.clock_in.slice(0, 10) >= periodStart && l.clock_in.slice(0, 10) <= periodEnd)
        .map((l) => l.clock_in.slice(0, 10))
    ).size || 4;
    const hours = round2(days * 8.6);
    const base = round2(staff.daily_rate * days);
    payrollEntries.push({
      id: uid(), payroll_period_id: '', profile_id: staff.id, hours_worked: hours, days_worked: days,
      base_pay: base, adjustments: [{ type: 'bonus', amount: 200, note: 'Bestseller upsell bonus' }],
      total_pay: round2(base + 200), notes: null, profile: staff,
    });
  }
  const payrollPeriods: PayrollPeriod[] = payrollEntries.length
    ? [{
        id: uid(), period_start: periodStart, period_end: periodEnd, status: 'draft',
        paid_at: null, paid_by: null, created_at: manilaInstant(...dayParts(0), 9, 0),
        entries: payrollEntries.map((e) => ({ ...e, payroll_period_id: 'demo-period' })),
      }]
    : [];

  // ── Commit ──
  orders.sort((a, b) => a.created_at.localeCompare(b.created_at));
  movements.sort((a, b) => a.created_at.localeCompare(b.created_at));
  writeCollection('orders', orders);
  writeCollection('stock_movements', movements);
  writeCollection('inventory_items', updatedInventory);
  writeCollection('expenses', expenses);
  writeCollection('time_logs', timeLogs);
  writeCollection('payroll_periods', payrollPeriods);
  writeSingleton<CafeSettings>({ ...settings, or_current: orderSeq });
}
