import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, inputClass, selectClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { ProductImage } from '@/components/ui/ProductImage';
import {
  saveProduct, deleteProduct, countProductSales, recipeCost,
  type ProductDraft, type VariantDraft,
} from '@/services/productService';
import { getInventory } from '@/services/inventoryService';
import { fileToResizedDataUrl } from '@/utils/image';
import type { Product, ProductCategory } from '@/types';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';

interface ProductEditorProps {
  product: Product | null; // null = create
  categories: ProductCategory[];
  onClose: () => void;
}

function toDraft(product: Product | null): ProductDraft {
  if (!product) {
    return {
      id: null,
      name: '',
      category_id: null,
      description: '',
      is_available: true,
      imageUrl: null,
      variants: [{ id: null, size_label: 'Regular', price: 0, recipe: [] }],
    };
  }
  return {
    id: product.id,
    name: product.name,
    category_id: product.category_id,
    description: product.description ?? '',
    is_available: product.is_available,
    imageUrl: product.image_url ?? null,
    variants: (product.variants ?? []).map((v) => ({
      id: v.id,
      size_label: v.size_label,
      price: v.price,
      recipe: (v.recipe_items ?? []).map((r) => ({
        inventory_item_id: r.inventory_item_id,
        qty_per_sale: r.qty_per_sale,
      })),
    })),
  };
}

export function ProductEditor({ product, categories, onClose }: ProductEditorProps) {
  const queryClient = useQueryClient();
  const isEdit = product !== null;

  const { data: inventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: getInventory });

  const [draft, setDraft] = useState<ProductDraft>(() => toDraft(product));
  const [activeVariant, setActiveVariant] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const variant = draft.variants[activeVariant] as VariantDraft | undefined;

  async function handleImagePick(file: File) {
    try {
      const { dataUrl } = await fileToResizedDataUrl(file);
      setDraft((d) => ({ ...d, imageUrl: dataUrl }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load that image');
    }
  }

  function patchVariant(index: number, patch: Partial<VariantDraft>) {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  function addVariant() {
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { id: null, size_label: '', price: 0, recipe: [] }],
    }));
    setActiveVariant(draft.variants.length);
  }

  function removeVariant(index: number) {
    if (draft.variants.length === 1) {
      toast.error('A product needs at least one size');
      return;
    }
    setDraft((d) => ({ ...d, variants: d.variants.filter((_, i) => i !== index) }));
    setActiveVariant((i) => Math.max(0, Math.min(i, draft.variants.length - 2)));
  }

  function patchRecipeRow(rowIndex: number, patch: Partial<{ inventory_item_id: string; qty_per_sale: number }>) {
    if (!variant) return;
    patchVariant(activeVariant, {
      recipe: variant.recipe.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)),
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => saveProduct(draft),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(`${saved.name} saved`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteProduct(product!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(`${product!.name} deleted`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  function handleDelete() {
    const sales = countProductSales(product!.id);
    const warning =
      sales > 0
        ? `Delete "${product!.name}"? It appears in ${sales} past order item${sales === 1 ? '' : 's'} — those receipts keep their records, but the product disappears from the menu.`
        : `Delete "${product!.name}" from the menu?`;
    if (window.confirm(warning)) deleteMutation.mutate();
  }

  const cost = variant ? recipeCost(variant.recipe, inventory) : 0;
  const margin = variant ? variant.price - cost : 0;

  return (
    <Modal
      title={isEdit ? 'Edit Product' : 'New Product'}
      subtitle={isEdit ? product.name : 'Add a drink or dish to the menu'}
      onClose={onClose}
      maxWidth="max-w-[640px]"
      footer={
        <div className="flex gap-2">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="h-11 px-4 rounded-xl border border-line text-muted text-[12.5px] font-semibold hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-40"
            >
              Delete
            </button>
          )}
          <div className="flex-1">
            <PrimaryButton
              onClick={() => saveMutation.mutate()}
              disabled={!draft.name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">

        {/* ── Basics ── */}
        <div className="grid grid-cols-[1fr_180px] gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Product name</label>
            <input
              autoFocus={!isEdit}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Ube Latte"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Category</label>
            <select
              value={draft.category_id ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, category_id: e.target.value || null }))}
              className={selectClass}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Description (optional)</label>
          <input
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Shown on the order screen"
            className={inputClass}
          />
        </div>

        {/* ── Photo ── */}
        <div className="space-y-1.5">
          <label className={labelClass}>Photo (optional)</label>
          <div className="flex items-center gap-4">
            <div className="flex-none w-20 h-20 rounded-xl overflow-hidden border border-line">
              <ProductImage src={draft.imageUrl} alt={draft.name || 'Product'} iconSize={30} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-line bg-cream/50 text-[12px] font-semibold text-espresso hover:border-caramel transition-colors"
                >
                  <ImagePlus size={14} /> {draft.imageUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {draft.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, imageUrl: null }))}
                    className="flex items-center gap-1 h-9 px-3 rounded-lg border border-line text-[12px] font-semibold text-muted hover:text-danger hover:border-danger/40 transition-colors"
                  >
                    <X size={13} /> Remove
                  </button>
                )}
              </div>
              <p className="text-[10.5px] text-faint">Shown on the POS. Auto-resized — any photo works.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImagePick(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-line bg-cream/40 px-4 py-3 cursor-pointer">
          <div>
            <p className="text-[13px] font-semibold text-dark-roast">Available on the menu</p>
            <p className="text-[11.5px] text-muted mt-0.5">
              Turn off to hide it from the POS without deleting it.
            </p>
          </div>
          <input
            type="checkbox"
            checked={draft.is_available}
            onChange={(e) => setDraft((d) => ({ ...d, is_available: e.target.checked }))}
            className="accent-caramel w-5 h-5"
          />
        </label>

        {/* ── Sizes ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Sizes & prices</label>
            <button
              onClick={addVariant}
              className="flex items-center gap-1 text-[11.5px] font-semibold text-caramel hover:text-espresso transition-colors"
            >
              <Plus size={13} /> Add size
            </button>
          </div>
          <div className="space-y-2">
            {draft.variants.map((v, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-2 transition-colors cursor-pointer',
                  i === activeVariant ? 'border-caramel bg-caramel/8' : 'border-line bg-cream/30 hover:border-caramel/50'
                )}
                onClick={() => setActiveVariant(i)}
              >
                <input
                  value={v.size_label}
                  onChange={(e) => patchVariant(i, { size_label: e.target.value })}
                  placeholder="Size (e.g. 16oz)"
                  className={cn(inputClass, 'h-9 flex-1')}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="relative w-[120px] flex-none">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">₱</span>
                  <input
                    type="number"
                    min={0}
                    value={v.price || ''}
                    onChange={(e) => patchVariant(i, { price: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className={cn(inputClass, 'h-9 pl-7')}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeVariant(i); }}
                  className="flex-none w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-danger hover:bg-danger-soft transition-colors"
                  aria-label={`Remove ${v.size_label || 'size'}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recipe for active variant ── */}
        {variant && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>
                Recipe — {variant.size_label || `size ${activeVariant + 1}`}
              </label>
              <button
                onClick={() =>
                  patchVariant(activeVariant, {
                    recipe: [...variant.recipe, { inventory_item_id: '', qty_per_sale: 0 }],
                  })
                }
                className="flex items-center gap-1 text-[11.5px] font-semibold text-caramel hover:text-espresso transition-colors"
              >
                <Plus size={13} /> Add ingredient
              </button>
            </div>

            {variant.recipe.length === 0 ? (
              <p className="text-[12px] text-muted rounded-xl border border-dashed border-line px-4 py-4 text-center">
                No recipe yet — without one, stock won't be deducted and availability won't be tracked.
              </p>
            ) : (
              <div className="space-y-1.5">
                {variant.recipe.map((row, i) => {
                  const item = inventory.find((inv) => inv.id === row.inventory_item_id);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={row.inventory_item_id}
                        onChange={(e) => patchRecipeRow(i, { inventory_item_id: e.target.value })}
                        className={cn(selectClass, 'h-9 flex-1')}
                      >
                        <option value="">Select ingredient…</option>
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.qty_per_sale || ''}
                        onChange={(e) => patchRecipeRow(i, { qty_per_sale: Number(e.target.value) || 0 })}
                        placeholder="Qty"
                        className={cn(inputClass, 'h-9 w-[84px] flex-none text-right')}
                      />
                      <span className="w-9 flex-none text-[11px] text-muted">{item?.unit_name ?? ''}</span>
                      <span className="w-[64px] flex-none text-right text-[11.5px] text-muted">
                        {item ? formatMoney(item.unit_cost * row.qty_per_sale) : '—'}
                      </span>
                      <button
                        onClick={() =>
                          patchVariant(activeVariant, {
                            recipe: variant.recipe.filter((_, j) => j !== i),
                          })
                        }
                        className="flex-none w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-danger hover:bg-danger-soft transition-colors"
                        aria-label="Remove ingredient"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cost summary */}
            <div className="mt-3 rounded-xl border border-line bg-cream/40 px-4 py-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Ingredient cost</p>
                <p className="text-[14px] font-semibold text-espresso mt-1">{formatMoney(cost)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Price</p>
                <p className="text-[14px] font-semibold text-espresso mt-1">{formatMoney(variant.price)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Margin</p>
                <p className={cn('text-[14px] font-semibold mt-1', margin >= 0 ? 'text-sage' : 'text-danger')}>
                  {formatMoney(margin)}
                  {variant.price > 0 && (
                    <span className="text-[11px] font-medium text-muted ml-1">
                      ({Math.round((margin / variant.price) * 100)}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
