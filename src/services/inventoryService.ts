// ─── Inventory Service ────────────────────────────────────────────────────────
// Stock queries plus the two write paths that mirror the Postgres RPCs:
// processStockIn() → process_stock_in() (weighted average cost + purchase record)
// adjustStock()    → adjust_stock()     (manual adjustment / waste)

import type {
  InventoryItem, InventoryCategory, Unit, StockMovement, Purchase, Profile,
} from '@/types';
import {
  readCollection, writeCollection, uid, nowIso,
} from '@/services/storage';

// ─── Queries ─────────────────────────────────────────────────────────────────

export interface InventoryRow extends InventoryItem {
  category_name: string;
  unit_name: string;
  stock_value: number;
  status: 'ok' | 'low' | 'out';
}

export async function getInventory(): Promise<InventoryRow[]> {
  const items = readCollection<InventoryItem>('inventory_items');
  const categories = readCollection<InventoryCategory>('inventory_categories');
  const units = readCollection<Unit>('units');
  const catById = new Map(categories.map((c) => [c.id, c]));
  const unitById = new Map(units.map((u) => [u.id, u]));

  return items
    .filter((i) => i.is_active)
    .map((i): InventoryRow => ({
      ...i,
      category_name: (i.category_id && catById.get(i.category_id)?.name) || 'Uncategorized',
      unit_name: (i.unit_id && unitById.get(i.unit_id)?.name) || '',
      stock_value: Math.round(i.current_stock * i.unit_cost * 100) / 100,
      status:
        i.current_stock <= 0 ? 'out' : i.current_stock <= i.low_stock_threshold ? 'low' : 'ok',
    }))
    .sort((a, b) => a.category_name.localeCompare(b.category_name) || a.name.localeCompare(b.name));
}

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  return readCollection<InventoryCategory>('inventory_categories')
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getUnits(): Promise<Unit[]> {
  return readCollection<Unit>('units').sort((a, b) => a.sort_order - b.sort_order);
}

export interface MovementRow extends StockMovement {
  item_name: string;
  unit_name: string;
  actor_name: string;
}

export async function getMovements(limit = 100, inventoryItemId?: string): Promise<MovementRow[]> {
  const movements = readCollection<StockMovement>('stock_movements');
  const items = readCollection<InventoryItem>('inventory_items');
  const units = readCollection<Unit>('units');
  const profiles = readCollection<Profile>('profiles');
  const itemById = new Map(items.map((i) => [i.id, i]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return movements
    .filter((m) => !inventoryItemId || m.inventory_item_id === inventoryItemId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((m) => {
      const item = itemById.get(m.inventory_item_id);
      return {
        ...m,
        item_name: item?.name ?? 'Deleted item',
        unit_name: (item?.unit_id && unitById.get(item.unit_id)?.name) || '',
        actor_name: (m.created_by && profileById.get(m.created_by)?.full_name) || '—',
      };
    });
}

// ─── Stock In (weighted average cost) ────────────────────────────────────────

export interface StockInInput {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  supplier: string | null;
  note: string | null;
  createdBy: string;
}

export function processStockIn(input: StockInInput): void {
  if (input.quantity <= 0) throw new Error('Quantity must be greater than zero');
  if (input.unitCost < 0) throw new Error('Unit cost cannot be negative');

  const items = readCollection<InventoryItem>('inventory_items');
  const item = items.find((i) => i.id === input.inventoryItemId);
  if (!item) throw new Error('Inventory item not found');

  const now = nowIso();

  // Weighted average cost: existing stock at old cost + incoming at new cost.
  // Negative on-hand (data drift) is treated as zero so it can't poison the average.
  const onHand = Math.max(0, item.current_stock);
  const newStock = item.current_stock + input.quantity;
  const newCost =
    onHand + input.quantity > 0
      ? Math.round(((onHand * item.unit_cost + input.quantity * input.unitCost) / (onHand + input.quantity)) * 10000) / 10000
      : input.unitCost;

  const purchaseId = uid();
  const purchase: Purchase = {
    id: purchaseId,
    supplier: input.supplier,
    notes: input.note,
    total: Math.round(input.quantity * input.unitCost * 100) / 100,
    created_by: input.createdBy,
    created_at: now,
    items: [
      {
        id: uid(),
        purchase_id: purchaseId,
        inventory_item_id: item.id,
        quantity: input.quantity,
        unit_cost: input.unitCost,
        line_total: Math.round(input.quantity * input.unitCost * 100) / 100,
      },
    ],
  };

  const movement: StockMovement = {
    id: uid(),
    inventory_item_id: item.id,
    qty_change: input.quantity,
    movement_type: 'stock_in',
    reference_id: purchaseId,
    reference_type: 'purchase',
    note: input.supplier ? `Stock in from ${input.supplier}` : 'Stock in',
    created_by: input.createdBy,
    created_at: now,
  };

  writeCollection(
    'inventory_items',
    items.map((i) =>
      i.id === item.id
        ? { ...i, current_stock: newStock, unit_cost: newCost, updated_at: now }
        : i
    )
  );
  const purchases = readCollection<Purchase>('purchases');
  purchases.push(purchase);
  writeCollection('purchases', purchases);
  const movements = readCollection<StockMovement>('stock_movements');
  movements.push(movement);
  writeCollection('stock_movements', movements);
}

// ─── Manual Adjustment / Waste ───────────────────────────────────────────────

export interface AdjustStockInput {
  inventoryItemId: string;
  qtyChange: number; // positive = add, negative = remove
  reason: 'adjustment' | 'waste';
  note: string | null;
  createdBy: string;
}

export function adjustStock(input: AdjustStockInput): void {
  if (input.qtyChange === 0) throw new Error('Quantity change cannot be zero');

  const items = readCollection<InventoryItem>('inventory_items');
  const item = items.find((i) => i.id === input.inventoryItemId);
  if (!item) throw new Error('Inventory item not found');

  const newStock = Math.round((item.current_stock + input.qtyChange) * 100) / 100;
  if (newStock < 0) {
    throw new Error(`Cannot remove more than the ${item.current_stock} on hand`);
  }

  const now = nowIso();

  writeCollection(
    'inventory_items',
    items.map((i) =>
      i.id === item.id ? { ...i, current_stock: newStock, updated_at: now } : i
    )
  );
  const movements = readCollection<StockMovement>('stock_movements');
  movements.push({
    id: uid(),
    inventory_item_id: item.id,
    qty_change: input.qtyChange,
    movement_type: input.reason,
    reference_id: null,
    reference_type: null,
    note: input.note,
    created_by: input.createdBy,
    created_at: now,
  });
  writeCollection('stock_movements', movements);
}

// ─── Item CRUD ───────────────────────────────────────────────────────────────

export interface ItemFormInput {
  name: string;
  categoryId: string | null;
  unitId: string | null;
  lowStockThreshold: number;
  unitCost: number;
  initialStock?: number; // create only
}

export function createInventoryItem(input: ItemFormInput, createdBy: string): InventoryItem {
  const name = input.name.trim();
  if (!name) throw new Error('Item name is required');

  const items = readCollection<InventoryItem>('inventory_items');
  if (items.some((i) => i.is_active && i.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`"${name}" already exists in inventory`);
  }

  const now = nowIso();
  const item: InventoryItem = {
    id: uid(),
    name,
    category_id: input.categoryId,
    unit_id: input.unitId,
    current_stock: input.initialStock ?? 0,
    low_stock_threshold: input.lowStockThreshold,
    unit_cost: input.unitCost,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  items.push(item);
  writeCollection('inventory_items', items);

  if (item.current_stock > 0) {
    const movements = readCollection<StockMovement>('stock_movements');
    movements.push({
      id: uid(),
      inventory_item_id: item.id,
      qty_change: item.current_stock,
      movement_type: 'adjustment',
      reference_id: null,
      reference_type: null,
      note: 'Opening stock',
      created_by: createdBy,
      created_at: now,
    });
    writeCollection('stock_movements', movements);
  }
  return item;
}

export function updateInventoryItem(itemId: string, input: ItemFormInput): void {
  const name = input.name.trim();
  if (!name) throw new Error('Item name is required');

  const items = readCollection<InventoryItem>('inventory_items');
  const item = items.find((i) => i.id === itemId);
  if (!item) throw new Error('Inventory item not found');
  if (items.some((i) => i.id !== itemId && i.is_active && i.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`"${name}" already exists in inventory`);
  }

  writeCollection(
    'inventory_items',
    items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            name,
            category_id: input.categoryId,
            unit_id: input.unitId,
            low_stock_threshold: input.lowStockThreshold,
            unit_cost: input.unitCost,
            updated_at: nowIso(),
          }
        : i
    )
  );
}

export function deactivateInventoryItem(itemId: string): void {
  const items = readCollection<InventoryItem>('inventory_items');
  if (!items.some((i) => i.id === itemId)) throw new Error('Inventory item not found');
  writeCollection(
    'inventory_items',
    items.map((i) => (i.id === itemId ? { ...i, is_active: false, updated_at: nowIso() } : i))
  );
}
