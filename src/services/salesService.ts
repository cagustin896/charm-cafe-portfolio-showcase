// ─── Sales Service ────────────────────────────────────────────────────────────
// Write-side of the POS. completeSale() mirrors the complete_sale() Postgres
// RPC: preflight stock check across the whole cart BEFORE any writes, then
// order creation, stock deduction, and an append-only movement log.

import type {
  CartItem, Order, OrderItem, OrderItemAddOn, OrderType, PaymentMethod,
  Product, AddOn, InventoryItem, StockMovement, CafeSettings, CompleteSaleResult,
} from '@/types';
import {
  readCollection, writeCollection, readSingleton, writeSingleton, uid, nowIso,
} from '@/services/storage';
import { DEFAULT_SETTINGS } from '@/data/seed';

export interface CompleteSaleInput {
  items: CartItem[];
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  discountTypeId: string | null;
  discountTypeName: string | null;
  discountAmount: number;
  amountTendered: number | null; // cash only
  gcashRef: string | null;
  createdBy: string;
}

interface Requirement {
  itemId: string;
  itemName: string;
  required: number;
  available: number;
}

export function completeSale(input: CompleteSaleInput): CompleteSaleResult {
  if (input.items.length === 0) throw new Error('Cart is empty');

  const products = readCollection<Product>('products');
  const addOns = readCollection<AddOn>('add_ons');
  const inventory = readCollection<InventoryItem>('inventory_items');

  const variantById = new Map(
    products.flatMap((p) => (p.variants ?? []).map((v) => [v.id, v] as const))
  );
  const addOnById = new Map(addOns.map((a) => [a.id, a]));
  const invById = new Map(inventory.map((i) => [i.id, i]));

  // ── 1. Preflight: aggregate required quantities across the entire cart ──
  const required = new Map<string, number>();
  const addRequirement = (itemId: string, qty: number) => {
    required.set(itemId, (required.get(itemId) ?? 0) + qty);
  };

  for (const line of input.items) {
    const variant = variantById.get(line.variantId);
    if (!variant) throw new Error(`Product no longer exists: ${line.productName}`);

    for (const r of variant.recipe_items ?? []) {
      addRequirement(r.inventory_item_id, r.qty_per_sale * line.quantity);
    }
    for (const cartAddOn of line.addOns) {
      const addOn = addOnById.get(cartAddOn.addOnId);
      for (const r of addOn?.recipe_items ?? []) {
        addRequirement(r.inventory_item_id, r.qty_per_sale * line.quantity);
      }
    }
  }

  const shortages: Requirement[] = [];
  for (const [itemId, qty] of required) {
    const item = invById.get(itemId);
    const available = item?.current_stock ?? 0;
    if (available < qty) {
      shortages.push({
        itemId,
        itemName: item?.name ?? 'Unknown ingredient',
        required: qty,
        available,
      });
    }
  }
  if (shortages.length > 0) {
    const detail = shortages
      .map((s) => `${s.itemName} (need ${s.required}, have ${s.available})`)
      .join(', ');
    throw new Error(`Insufficient stock: ${detail}`);
  }

  // ── 2. Totals ──
  const subtotal = input.items.reduce((sum, i) => sum + i.linePrice * i.quantity, 0);
  const discountAmount = Math.min(input.discountAmount, subtotal);
  const total = subtotal - discountAmount;

  if (input.paymentMethod === 'cash') {
    if (input.amountTendered == null || input.amountTendered < total) {
      throw new Error('Cash tendered is less than the total');
    }
  }
  const changeDue =
    input.paymentMethod === 'cash' && input.amountTendered != null
      ? Math.round((input.amountTendered - total) * 100) / 100
      : 0;

  // ── 3. Order number ──
  const settings = readSingleton<CafeSettings>(DEFAULT_SETTINGS);
  const orderSeq = settings.or_current + 1;
  const orderNo = `${settings.or_prefix}-${String(orderSeq).padStart(4, '0')}`;

  // ── 4. Build order with embedded items ──
  const orderId = uid();
  const now = nowIso();

  const orderItems: OrderItem[] = input.items.map((line) => {
    const orderItemId = uid();
    const itemAddOns: OrderItemAddOn[] = line.addOns.map((a) => ({
      id: uid(),
      order_item_id: orderItemId,
      add_on_id: a.addOnId,
      add_on_name: a.addOnName,
      price: a.price,
    }));
    return {
      id: orderItemId,
      order_id: orderId,
      variant_id: line.variantId,
      product_name: line.productName,
      size_label: line.sizeLabel,
      unit_price: line.linePrice,
      quantity: line.quantity,
      line_total: line.linePrice * line.quantity,
      is_voided: false,
      void_reason: null,
      voided_by: null,
      voided_at: null,
      add_ons: itemAddOns,
    };
  });

  const order: Order = {
    id: orderId,
    order_no: orderNo,
    order_type: input.orderType,
    payment_method: input.paymentMethod,
    cash_amount: input.paymentMethod === 'cash' ? total : null,
    gcash_amount: input.paymentMethod === 'gcash' ? total : null,
    gcash_ref: input.paymentMethod === 'gcash' ? input.gcashRef : null,
    subtotal,
    discount_type_id: input.discountTypeId,
    discount_type_name: input.discountTypeName,
    discount_amount: discountAmount,
    total,
    amount_tendered: input.paymentMethod === 'cash' ? input.amountTendered : null,
    change_due: input.paymentMethod === 'cash' ? changeDue : null,
    status: 'completed',
    void_reason: null,
    voided_by: null,
    voided_at: null,
    created_by: input.createdBy,
    created_at: now,
    items: orderItems,
  };

  // ── 5. Deduct stock + movement log ──
  const updatedInventory = inventory.map((item) => {
    const qty = required.get(item.id);
    if (!qty) return item;
    return {
      ...item,
      current_stock: Math.round((item.current_stock - qty) * 100) / 100,
      updated_at: now,
    };
  });

  const movements = readCollection<StockMovement>('stock_movements');
  for (const [itemId, qty] of required) {
    movements.push({
      id: uid(),
      inventory_item_id: itemId,
      qty_change: -qty,
      movement_type: 'sale',
      reference_id: orderId,
      reference_type: 'order',
      note: `Sale ${orderNo}`,
      created_by: input.createdBy,
      created_at: now,
    });
  }

  // ── 6. Commit (single synchronous block — no partial writes on throw) ──
  const orders = readCollection<Order>('orders');
  orders.push(order);
  writeCollection('orders', orders);
  writeCollection('inventory_items', updatedInventory);
  writeCollection('stock_movements', movements);
  writeSingleton<CafeSettings>({ ...settings, or_current: orderSeq });

  return {
    order_id: orderId,
    order_no: orderNo,
    total,
    change_due: changeDue,
  };
}

// ─── Void (mirrors void_order_item RPC) ──────────────────────────────────────

export function voidOrderItem(
  orderId: string,
  orderItemId: string,
  reason: string,
  voidedBy: string
): void {
  if (!reason.trim()) throw new Error('A void reason is required');

  const orders = readCollection<Order>('orders');
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');
  const item = (order.items ?? []).find((i) => i.id === orderItemId);
  if (!item) throw new Error('Order item not found');
  if (item.is_voided) throw new Error('This item is already voided');

  const products = readCollection<Product>('products');
  const addOns = readCollection<AddOn>('add_ons');
  const variantById = new Map(
    products.flatMap((p) => (p.variants ?? []).map((v) => [v.id, v] as const))
  );
  const addOnById = new Map(addOns.map((a) => [a.id, a]));

  // Restore the exact quantities the sale deducted (variant + add-on recipes)
  const restore = new Map<string, number>();
  const addRestore = (itemId: string, qty: number) =>
    restore.set(itemId, (restore.get(itemId) ?? 0) + qty);

  const variant = item.variant_id ? variantById.get(item.variant_id) : undefined;
  for (const r of variant?.recipe_items ?? []) {
    addRestore(r.inventory_item_id, r.qty_per_sale * item.quantity);
  }
  for (const lineAddOn of item.add_ons ?? []) {
    const addOn = lineAddOn.add_on_id ? addOnById.get(lineAddOn.add_on_id) : undefined;
    for (const r of addOn?.recipe_items ?? []) {
      addRestore(r.inventory_item_id, r.qty_per_sale * item.quantity);
    }
  }

  const now = nowIso();
  const inventory = readCollection<InventoryItem>('inventory_items');
  const updatedInventory = inventory.map((inv) => {
    const qty = restore.get(inv.id);
    if (!qty) return inv;
    return {
      ...inv,
      current_stock: Math.round((inv.current_stock + qty) * 100) / 100,
      updated_at: now,
    };
  });

  const movements = readCollection<StockMovement>('stock_movements');
  for (const [invId, qty] of restore) {
    // Only log restores for items that still exist in inventory
    if (!inventory.some((inv) => inv.id === invId)) continue;
    movements.push({
      id: uid(),
      inventory_item_id: invId,
      qty_change: qty,
      movement_type: 'void_restore',
      reference_id: orderId,
      reference_type: 'order',
      note: `Void ${order.order_no}: ${item.product_name}${reason.trim() ? ` — ${reason.trim()}` : ''}`,
      created_by: voidedBy,
      created_at: now,
    });
  }

  // Update the item and recompute order totals (recorded discount stays as-is)
  const updatedItems = (order.items ?? []).map((i) =>
    i.id === orderItemId
      ? { ...i, is_voided: true, void_reason: reason.trim(), voided_by: voidedBy, voided_at: now }
      : i
  );
  const newSubtotal = updatedItems.reduce((s, i) => s + (i.is_voided ? 0 : i.line_total), 0);
  const allVoided = updatedItems.every((i) => i.is_voided);

  const updatedOrder: Order = {
    ...order,
    items: updatedItems,
    subtotal: newSubtotal,
    total: Math.max(0, newSubtotal - order.discount_amount),
    status: allVoided ? 'voided' : order.status,
    void_reason: allVoided ? reason.trim() : order.void_reason,
    voided_by: allVoided ? voidedBy : order.voided_by,
    voided_at: allVoided ? now : order.voided_at,
  };

  writeCollection('orders', orders.map((o) => (o.id === orderId ? updatedOrder : o)));
  writeCollection('inventory_items', updatedInventory);
  writeCollection('stock_movements', movements);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getOrders(limit = 50): Promise<Order[]> {
  return readCollection<Order>('orders')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  return readCollection<Order>('orders').find((o) => o.id === orderId) ?? null;
}
