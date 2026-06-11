// ─── Product Service ──────────────────────────────────────────────────────────
// Write-side of the menu: product/variant/recipe CRUD and add-on CRUD.
// Products embed their variants and recipe items, so a save replaces the whole
// product document — same contract a Supabase transaction would fulfill.

import type { Product, ProductVariant, AddOn, InventoryItem, Order } from '@/types';
import { readCollection, writeCollection, uid, nowIso } from '@/services/storage';

// ─── Drafts ──────────────────────────────────────────────────────────────────

export interface RecipeDraft {
  inventory_item_id: string;
  qty_per_sale: number;
}

export interface VariantDraft {
  id: string | null; // null = new
  size_label: string;
  price: number;
  recipe: RecipeDraft[];
}

export interface ProductDraft {
  id: string | null; // null = new
  name: string;
  category_id: string | null;
  description: string;
  is_available: boolean;
  variants: VariantDraft[];
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateDraft(draft: ProductDraft): void {
  if (!draft.name.trim()) throw new Error('Product name is required');
  if (draft.variants.length === 0) throw new Error('Add at least one size/variant');

  const labels = new Set<string>();
  for (const v of draft.variants) {
    const label = v.size_label.trim();
    if (!label) throw new Error('Every variant needs a size label');
    if (labels.has(label.toLowerCase())) throw new Error(`Duplicate size "${label}"`);
    labels.add(label.toLowerCase());
    if (!(v.price > 0)) throw new Error(`"${label}" needs a price greater than zero`);

    const usedItems = new Set<string>();
    for (const r of v.recipe) {
      if (!r.inventory_item_id) throw new Error(`"${label}" has a recipe row with no ingredient selected`);
      if (usedItems.has(r.inventory_item_id)) throw new Error(`"${label}" lists the same ingredient twice`);
      usedItems.add(r.inventory_item_id);
      if (!(r.qty_per_sale > 0)) throw new Error(`"${label}" has an ingredient with no quantity`);
    }
  }
}

// ─── Product CRUD ────────────────────────────────────────────────────────────

export function saveProduct(draft: ProductDraft): Product {
  validateDraft(draft);

  const products = readCollection<Product>('products');
  const name = draft.name.trim();
  if (
    products.some(
      (p) => p.id !== draft.id && p.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    throw new Error(`A product named "${name}" already exists`);
  }

  const now = nowIso();
  const existing = draft.id ? products.find((p) => p.id === draft.id) : undefined;
  const productId = existing?.id ?? uid();

  const existingVariantsById = new Map(
    (existing?.variants ?? []).map((v) => [v.id, v])
  );

  const variants: ProductVariant[] = draft.variants.map((v, i) => {
    const variantId = (v.id && existingVariantsById.has(v.id) ? v.id : null) ?? uid();
    return {
      id: variantId,
      product_id: productId,
      size_label: v.size_label.trim(),
      price: v.price,
      sort_order: i + 1,
      is_active: true,
      recipe_items: v.recipe.map((r) => ({
        id: `${variantId}::${r.inventory_item_id}`,
        variant_id: variantId,
        inventory_item_id: r.inventory_item_id,
        qty_per_sale: r.qty_per_sale,
      })),
    };
  });

  const product: Product = {
    id: productId,
    name,
    category_id: draft.category_id,
    image_url: existing?.image_url ?? null,
    description: draft.description.trim() || null,
    is_available: draft.is_available,
    sort_order: existing?.sort_order ?? (Math.max(0, ...products.map((p) => p.sort_order)) + 1),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    variants,
  };

  writeCollection(
    'products',
    existing
      ? products.map((p) => (p.id === productId ? product : p))
      : [...products, product]
  );
  return product;
}

export function setProductAvailability(productId: string, isAvailable: boolean): void {
  const products = readCollection<Product>('products');
  if (!products.some((p) => p.id === productId)) throw new Error('Product not found');
  writeCollection(
    'products',
    products.map((p) =>
      p.id === productId ? { ...p, is_available: isAvailable, updated_at: nowIso() } : p
    )
  );
}

export function deleteProduct(productId: string): void {
  const products = readCollection<Product>('products');
  const product = products.find((p) => p.id === productId);
  if (!product) throw new Error('Product not found');

  // Past orders keep their own name/price snapshots, so removal is safe.
  writeCollection('products', products.filter((p) => p.id !== productId));
}

/** How many completed orders reference this product (for the delete warning). */
export function countProductSales(productId: string): number {
  const products = readCollection<Product>('products');
  const variantIds = new Set(
    (products.find((p) => p.id === productId)?.variants ?? []).map((v) => v.id)
  );
  const orders = readCollection<Order>('orders');
  let count = 0;
  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (item.variant_id && variantIds.has(item.variant_id)) count += 1;
    }
  }
  return count;
}

// ─── Add-On CRUD ─────────────────────────────────────────────────────────────

export interface AddOnDraft {
  id: string | null;
  name: string;
  price: number;
  recipe: RecipeDraft[];
}

export function saveAddOn(draft: AddOnDraft): AddOn {
  const name = draft.name.trim();
  if (!name) throw new Error('Add-on name is required');
  if (!(draft.price >= 0)) throw new Error('Price cannot be negative');

  const usedItems = new Set<string>();
  for (const r of draft.recipe) {
    if (!r.inventory_item_id) throw new Error('A recipe row has no ingredient selected');
    if (usedItems.has(r.inventory_item_id)) throw new Error('The same ingredient is listed twice');
    usedItems.add(r.inventory_item_id);
    if (!(r.qty_per_sale > 0)) throw new Error('Every ingredient needs a quantity');
  }

  const addOns = readCollection<AddOn>('add_ons');
  if (addOns.some((a) => a.id !== draft.id && a.is_active && a.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`An add-on named "${name}" already exists`);
  }

  const existing = draft.id ? addOns.find((a) => a.id === draft.id) : undefined;
  const addOnId = existing?.id ?? uid();

  const addOn: AddOn = {
    id: addOnId,
    name,
    price: draft.price,
    is_active: true,
    sort_order: existing?.sort_order ?? (Math.max(0, ...addOns.map((a) => a.sort_order)) + 1),
    created_at: existing?.created_at ?? nowIso(),
    recipe_items: draft.recipe.map((r) => ({
      id: `${addOnId}::${r.inventory_item_id}`,
      add_on_id: addOnId,
      inventory_item_id: r.inventory_item_id,
      qty_per_sale: r.qty_per_sale,
    })),
  };

  writeCollection(
    'add_ons',
    existing ? addOns.map((a) => (a.id === addOnId ? addOn : a)) : [...addOns, addOn]
  );
  return addOn;
}

export function deleteAddOn(addOnId: string): void {
  const addOns = readCollection<AddOn>('add_ons');
  if (!addOns.some((a) => a.id === addOnId)) throw new Error('Add-on not found');
  writeCollection(
    'add_ons',
    addOns.map((a) => (a.id === addOnId ? { ...a, is_active: false } : a))
  );
}

// ─── Costing helper ──────────────────────────────────────────────────────────

export function recipeCost(recipe: RecipeDraft[], inventory: InventoryItem[]): number {
  const costById = new Map(inventory.map((i) => [i.id, i.unit_cost]));
  return recipe.reduce(
    (sum, r) => sum + (costById.get(r.inventory_item_id) ?? 0) * r.qty_per_sale,
    0
  );
}
