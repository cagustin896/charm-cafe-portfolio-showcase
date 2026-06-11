// ─── Catalog Service ──────────────────────────────────────────────────────────
// Read-side of the menu: products, variants, categories, add-ons, and the
// Auto-86 availability computation (mirrors the product_availability SQL view).

import type {
  Product, ProductCategory, AddOn, InventoryItem, ProductAvailability,
  RecipeIngredientStatus,
} from '@/types';
import { readCollection } from '@/services/storage';

export interface Catalog {
  categories: ProductCategory[];
  products: Product[];
  addOns: AddOn[];
  availability: Map<string, ProductAvailability>; // keyed by variant_id
}

export async function getCatalog(): Promise<Catalog> {
  const categories = readCollection<ProductCategory>('product_categories')
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const products = readCollection<Product>('products')
    .sort((a, b) => a.sort_order - b.sort_order);

  const addOns = readCollection<AddOn>('add_ons')
    .filter((a) => a.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const inventory = readCollection<InventoryItem>('inventory_items');
  const stockById = new Map(inventory.map((i) => [i.id, i]));

  const availability = new Map<string, ProductAvailability>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.is_active) continue;

      const recipeStatus: RecipeIngredientStatus[] = (variant.recipe_items ?? []).map((r) => {
        const item = stockById.get(r.inventory_item_id);
        const available = item?.current_stock ?? 0;
        return {
          inventory_item_id: r.inventory_item_id,
          inventory_item_name: item?.name ?? 'Unknown ingredient',
          required: r.qty_per_sale,
          available,
          sufficient: available >= r.qty_per_sale,
        };
      });

      const canSell =
        product.is_available && recipeStatus.every((s) => s.sufficient);

      availability.set(variant.id, {
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        size_label: variant.size_label,
        price: variant.price,
        is_available: product.is_available,
        can_sell: canSell,
        recipe_status: recipeStatus.length > 0 ? recipeStatus : null,
      });
    }
  }

  return { categories, products, addOns, availability };
}

/** Estimated ingredient cost of one serving of a variant (for margin display). */
export function variantCost(product: Product, variantId: string, inventory: InventoryItem[]): number {
  const variant = product.variants?.find((v) => v.id === variantId);
  if (!variant) return 0;
  const costById = new Map(inventory.map((i) => [i.id, i.unit_cost]));
  return (variant.recipe_items ?? []).reduce(
    (sum, r) => sum + (costById.get(r.inventory_item_id) ?? 0) * r.qty_per_sale,
    0
  );
}
