// ─── Analytics Service ────────────────────────────────────────────────────────
// Sales summaries, trend series, top products, payment/category splits, and
// the P&L (revenue − COGS − expenses). COGS includes both the variant recipe
// AND each add-on's recipe, so gross profit is exact.

import type {
  Order, OrderItem, Product, AddOn, InventoryItem, Expense, AnalyticsPeriod,
} from '@/types';
import { readCollection } from '@/services/storage';
import { manilaDateKey, todayKey, toManila } from '@/utils/format';
import { format } from 'date-fns';

// ─── Cost maps (shared with assetService) ────────────────────────────────────

export interface CostMaps {
  costByItem: Map<string, number>;
  recipeByVariant: Map<string, { inventory_item_id: string; qty_per_sale: number }[]>;
  addOnById: Map<string, AddOn>;
  categoryByVariant: Map<string, string>;
}

export function buildCostMaps(): CostMaps {
  const products = readCollection<Product>('products');
  const addOns = readCollection<AddOn>('add_ons');
  const inventory = readCollection<InventoryItem>('inventory_items');
  const categories = readCollection<{ id: string; name: string }>('product_categories');
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const costByItem = new Map(inventory.map((i) => [i.id, i.unit_cost]));
  const recipeByVariant = new Map<string, { inventory_item_id: string; qty_per_sale: number }[]>();
  const categoryByVariant = new Map<string, string>();
  for (const p of products) {
    const cat = (p.category_id && catName.get(p.category_id)) || 'Other';
    for (const v of p.variants ?? []) {
      recipeByVariant.set(v.id, v.recipe_items ?? []);
      categoryByVariant.set(v.id, cat);
    }
  }
  return { costByItem, recipeByVariant, addOnById: new Map(addOns.map((a) => [a.id, a])), categoryByVariant };
}

/** Ingredient cost of one order line (variant recipe + add-on recipes) × qty. */
export function orderItemCogs(item: OrderItem, maps: CostMaps): number {
  const recipe = item.variant_id ? maps.recipeByVariant.get(item.variant_id) ?? [] : [];
  let unitCost = recipe.reduce(
    (sum, r) => sum + (maps.costByItem.get(r.inventory_item_id) ?? 0) * r.qty_per_sale,
    0
  );
  for (const lineAddOn of item.add_ons ?? []) {
    const addOn = lineAddOn.add_on_id ? maps.addOnById.get(lineAddOn.add_on_id) : undefined;
    for (const r of addOn?.recipe_items ?? []) {
      unitCost += (maps.costByItem.get(r.inventory_item_id) ?? 0) * r.qty_per_sale;
    }
  }
  return unitCost * item.quantity;
}

// ─── Date ranges (Manila business days) ──────────────────────────────────────

/** Pure calendar arithmetic on yyyy-MM-dd keys (no timezone involved). */
function shiftDayKey(key: string, days: number): string {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daySpan(startKey: string, endKey: string): number {
  const a = new Date(startKey + 'T00:00:00Z').getTime();
  const b = new Date(endKey + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000) + 1;
}

/** Range covering the last n Manila business days, ending today. */
export function lastNDaysRange(n: number): { startKey: string; endKey: string } {
  const today = todayKey();
  return { startKey: shiftDayKey(today, -(n - 1)), endKey: today };
}

export function resolveRange(
  period: AnalyticsPeriod,
  customStart?: string,
  customEnd?: string
): { startKey: string; endKey: string } {
  const today = todayKey();
  switch (period) {
    case 'today':
      return { startKey: today, endKey: today };
    case 'week':
      return { startKey: shiftDayKey(today, -6), endKey: today };
    case 'month':
      return { startKey: today.slice(0, 7) + '-01', endKey: today };
    case 'year':
      return { startKey: today.slice(0, 4) + '-01-01', endKey: today };
    case 'custom': {
      let s = customStart || today;
      let e = customEnd || today;
      if (s > e) [s, e] = [e, s];
      return { startKey: s, endKey: e };
    }
    case 'all': {
      const orders = readCollection<Order>('orders');
      const first = orders.reduce<string | null>(
        (min, o) => {
          const k = manilaDateKey(o.created_at);
          return min === null || k < min ? k : min;
        },
        null
      );
      return { startKey: first ?? today, endKey: today };
    }
  }
}

// ─── Analytics payload ───────────────────────────────────────────────────────

export interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsData {
  summary: {
    revenue: number;
    orders: number;
    aov: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    net: number;
  };
  trend: TrendPoint[];
  topProducts: { name: string; size: string; qty: number; revenue: number }[];
  paymentSplit: { method: string; amount: number; count: number }[];
  categorySplit: { category: string; revenue: number }[];
}

export function getOrdersInRange(startKey: string, endKey: string): Order[] {
  return readCollection<Order>('orders').filter((o) => {
    if (o.status !== 'completed') return false;
    const k = manilaDateKey(o.created_at);
    return k >= startKey && k <= endKey;
  });
}

export async function getAnalytics(
  period: AnalyticsPeriod,
  customStart?: string,
  customEnd?: string
): Promise<AnalyticsData> {
  const { startKey, endKey } = resolveRange(period, customStart, customEnd);
  const orders = getOrdersInRange(startKey, endKey);
  const maps = buildCostMaps();

  // ── Summary + splits in one pass ──
  let revenue = 0;
  let cogs = 0;
  const payMap = new Map<string, { amount: number; count: number }>();
  const productMap = new Map<string, { name: string; size: string; qty: number; revenue: number }>();
  const catMap = new Map<string, number>();

  for (const order of orders) {
    revenue += order.total;
    const pay = payMap.get(order.payment_method) ?? { amount: 0, count: 0 };
    pay.amount += order.total;
    pay.count += 1;
    payMap.set(order.payment_method, pay);

    for (const item of order.items ?? []) {
      if (item.is_voided) continue;
      cogs += orderItemCogs(item, maps);

      const key = `${item.product_name}::${item.size_label}`;
      const agg = productMap.get(key) ?? { name: item.product_name, size: item.size_label, qty: 0, revenue: 0 };
      agg.qty += item.quantity;
      agg.revenue += item.line_total;
      productMap.set(key, agg);

      const cat = (item.variant_id && maps.categoryByVariant.get(item.variant_id)) || 'Other';
      catMap.set(cat, (catMap.get(cat) ?? 0) + item.line_total);
    }
  }

  const expensesInRange = readCollection<Expense>('expenses')
    .filter((e) => e.expense_date >= startKey && e.expense_date <= endKey)
    .reduce((s, e) => s + e.amount, 0);

  const grossProfit = revenue - cogs;

  // ── Trend ──
  const trend = buildTrend(orders, period, startKey, endKey);

  return {
    summary: {
      revenue,
      orders: orders.length,
      aov: orders.length > 0 ? revenue / orders.length : 0,
      cogs,
      grossProfit,
      expenses: expensesInRange,
      net: grossProfit - expensesInRange,
    },
    trend,
    topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    paymentSplit: [...payMap.entries()]
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount),
    categorySplit: [...catMap.entries()]
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

function buildTrend(
  orders: Order[],
  period: AnalyticsPeriod,
  startKey: string,
  endKey: string
): TrendPoint[] {
  if (period === 'today') {
    // Hourly buckets across a sensible business window
    const byHour = new Map<number, { revenue: number; orders: number }>();
    for (const o of orders) {
      const h = toManila(o.created_at).getHours();
      const agg = byHour.get(h) ?? { revenue: 0, orders: 0 };
      agg.revenue += o.total;
      agg.orders += 1;
      byHour.set(h, agg);
    }
    const hoursWithData = [...byHour.keys()];
    const from = Math.min(8, ...(hoursWithData.length ? hoursWithData : [8]));
    const to = Math.max(20, ...(hoursWithData.length ? hoursWithData : [20]));
    const points: TrendPoint[] = [];
    for (let h = from; h <= to; h++) {
      const agg = byHour.get(h) ?? { revenue: 0, orders: 0 };
      const label = format(new Date(2000, 0, 1, h), 'h a');
      points.push({ label, ...agg });
    }
    return points;
  }

  const span = daySpan(startKey, endKey);
  const monthly = span > 62;

  const byBucket = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const k = manilaDateKey(o.created_at);
    const bucket = monthly ? k.slice(0, 7) : k;
    const agg = byBucket.get(bucket) ?? { revenue: 0, orders: 0 };
    agg.revenue += o.total;
    agg.orders += 1;
    byBucket.set(bucket, agg);
  }

  const points: TrendPoint[] = [];
  if (monthly) {
    let cursor = startKey.slice(0, 7);
    const last = endKey.slice(0, 7);
    while (cursor <= last) {
      const agg = byBucket.get(cursor) ?? { revenue: 0, orders: 0 };
      points.push({ label: format(new Date(cursor + '-01T00:00:00'), 'MMM yyyy'), ...agg });
      const [y, m] = cursor.split('-').map(Number);
      cursor = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
  } else {
    let cursor = startKey;
    while (cursor <= endKey) {
      const agg = byBucket.get(cursor) ?? { revenue: 0, orders: 0 };
      points.push({ label: format(new Date(cursor + 'T00:00:00'), 'MMM d'), ...agg });
      cursor = shiftDayKey(cursor, 1);
    }
  }
  return points;
}

// ─── CSV export ──────────────────────────────────────────────────────────────

export function exportOrdersCsv(startKey: string, endKey: string): number {
  const orders = getOrdersInRange(startKey, endKey)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const esc = (v: string | number | null) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    'Order No,Date,Time,Type,Payment,Items,Subtotal,Discount,Total',
    ...orders.map((o) => {
      const d = toManila(o.created_at);
      const itemCount = (o.items ?? []).reduce((s, i) => s + (i.is_voided ? 0 : i.quantity), 0);
      return [
        o.order_no,
        format(d, 'yyyy-MM-dd'),
        format(d, 'HH:mm'),
        o.order_type,
        o.payment_method,
        itemCount,
        o.subtotal.toFixed(2),
        o.discount_amount.toFixed(2),
        o.total.toFixed(2),
      ].map(esc).join(',');
    }),
  ];

  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `charm-cafe-sales-${startKey}-to-${endKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return orders.length;
}
