// ─── Asset Service ────────────────────────────────────────────────────────────
// Equipment & fixtures register. Payback is estimated from average daily gross
// profit (revenue − ingredient COGS) across the days the cafe has made sales.

import type { Asset, Order } from '@/types';
import { readCollection, writeCollection, uid, nowIso } from '@/services/storage';
import { manilaDateKey } from '@/utils/format';
import { buildCostMaps, orderItemCogs } from '@/services/analyticsService';

export async function getAssets(): Promise<Asset[]> {
  return readCollection<Asset>('assets')
    .filter((a) => a.is_active)
    .sort((a, b) => (b.purchase_date ?? '').localeCompare(a.purchase_date ?? ''));
}

export interface AssetInput {
  name: string;
  purchasePrice: number;
  purchaseDate: string | null;
  note: string | null;
}

export function saveAsset(input: AssetInput, id: string | null): Asset {
  if (!input.name.trim()) throw new Error('Asset name is required');
  if (!(input.purchasePrice >= 0)) throw new Error('Price cannot be negative');

  const assets = readCollection<Asset>('assets');

  if (id) {
    const existing = assets.find((a) => a.id === id);
    if (!existing) throw new Error('Asset not found');
    const updated: Asset = {
      ...existing,
      name: input.name.trim(),
      purchase_price: input.purchasePrice,
      purchase_date: input.purchaseDate,
      note: input.note,
    };
    writeCollection('assets', assets.map((a) => (a.id === id ? updated : a)));
    return updated;
  }

  const asset: Asset = {
    id: uid(),
    name: input.name.trim(),
    purchase_price: input.purchasePrice,
    purchase_date: input.purchaseDate,
    note: input.note,
    is_active: true,
    created_at: nowIso(),
  };
  writeCollection('assets', [...assets, asset]);
  return asset;
}

export function deleteAsset(id: string): void {
  const assets = readCollection<Asset>('assets');
  if (!assets.some((a) => a.id === id)) throw new Error('Asset not found');
  writeCollection('assets', assets.map((a) => (a.id === id ? { ...a, is_active: false } : a)));
}

// ─── Average daily gross profit (for payback estimate) ───────────────────────

export function avgDailyGrossProfit(): number {
  const orders = readCollection<Order>('orders').filter((o) => o.status === 'completed');
  if (orders.length === 0) return 0;

  const maps = buildCostMaps();
  const days = new Set<string>();
  let grossProfit = 0;

  for (const order of orders) {
    days.add(manilaDateKey(order.created_at));
    for (const item of order.items ?? []) {
      if (item.is_voided) continue;
      grossProfit += item.line_total - orderItemCogs(item, maps);
    }
  }

  return grossProfit / Math.max(1, days.size);
}
