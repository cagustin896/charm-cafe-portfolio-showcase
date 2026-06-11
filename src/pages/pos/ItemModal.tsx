import { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import type { Product } from '@/types';
import type { Catalog } from '@/services/catalogService';
import { useCartStore } from '@/stores/cartStore';
import { ProductImage } from '@/components/ui/ProductImage';
import { resolveProductImage } from '@/data/productImages';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';

interface ItemModalProps {
  product: Product;
  catalog: Catalog;
  showAddOns: boolean;
  onClose: () => void;
}

export function ItemModal({ product, catalog, showAddOns, onClose }: ItemModalProps) {
  const variants = (product.variants ?? []).filter((v) => v.is_active);
  const firstSellable = variants.find((v) => catalog.availability.get(v.id)?.can_sell);

  const [variantId, setVariantId] = useState<string | null>(firstSellable?.id ?? null);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((s) => s.addItem);

  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;
  const addOnsTotal = catalog.addOns
    .filter((a) => selectedAddOns.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const lineTotal = selectedVariant ? (selectedVariant.price + addOnsTotal) * quantity : 0;

  function toggleAddOn(addOnId: string) {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(addOnId)) next.delete(addOnId);
      else next.add(addOnId);
      return next;
    });
  }

  function handleAdd() {
    if (!selectedVariant) return;
    const addOns = catalog.addOns
      .filter((a) => selectedAddOns.has(a.id))
      .map((a) => ({ addOnId: a.id, addOnName: a.name, price: a.price }));

    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      sizeLabel: selectedVariant.size_label,
      basePrice: selectedVariant.price,
      addOns,
      quantity,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-dark-roast/40 backdrop-blur-[2px] grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-paper rounded-2xl border border-line shadow-[0_16px_60px_rgba(44,24,16,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="flex-none w-14 h-14 rounded-xl overflow-hidden border border-line">
              <ProductImage src={resolveProductImage(product)} alt={product.name} iconSize={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-caramel">
                {catalog.categories.find((c) => c.id === product.category_id)?.name ?? ''}
              </p>
              <h2 className="font-heading text-[20px] font-semibold text-dark-roast mt-0.5">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-muted text-[12px] mt-1 max-w-[260px]">{product.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-none w-8 h-8 rounded-full grid place-items-center text-taupe hover:text-espresso hover:bg-cream transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[55vh] overflow-y-auto">

          {/* Size */}
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Size</p>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((v) => {
                const avail = catalog.availability.get(v.id);
                const canSell = avail?.can_sell ?? false;
                const active = variantId === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => canSell && setVariantId(v.id)}
                    disabled={!canSell}
                    className={cn(
                      'relative h-14 rounded-xl border px-4 text-left transition-all',
                      active
                        ? 'border-caramel bg-caramel/10 shadow-[0_0_0_3px_rgba(164,124,88,0.12)]'
                        : canSell
                          ? 'border-line bg-cream/40 hover:border-caramel/60'
                          : 'border-line bg-cream/30 opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className={cn('block text-[13px] font-semibold', active ? 'text-espresso' : 'text-dark-roast')}>
                      {v.size_label}
                    </span>
                    <span className="block text-[12px] text-muted mt-0.5">{formatMoney(v.price)}</span>
                    {!canSell && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold text-danger uppercase">Out</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add-ons */}
          {showAddOns && catalog.addOns.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Add-ons</p>
              <div className="space-y-1.5">
                {catalog.addOns.map((a) => {
                  const checked = selectedAddOns.has(a.id);
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all',
                        checked ? 'border-caramel bg-caramel/8' : 'border-line bg-cream/30 hover:border-caramel/50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAddOn(a.id)}
                        className="accent-caramel w-4 h-4"
                      />
                      <span className="flex-1 text-[13px] font-medium text-dark-roast">{a.name}</span>
                      <span className="text-[12.5px] font-semibold text-espresso">+{formatMoney(a.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Quantity</p>
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-cream/40 p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full grid place-items-center text-espresso hover:bg-paper transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <span className="w-10 text-center font-heading text-[17px] font-semibold text-dark-roast">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                className="w-9 h-9 rounded-full grid place-items-center text-espresso hover:bg-paper transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-cream/30">
          <button
            onClick={handleAdd}
            disabled={!selectedVariant}
            className={cn(
              'w-full h-12 rounded-xl font-semibold text-[14px] transition-all',
              'bg-caramel text-paper hover:bg-caramel-dark',
              'shadow-[0_2px_8px_rgba(164,124,88,0.3)] hover:shadow-[0_4px_16px_rgba(164,124,88,0.4)]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
            )}
          >
            Add to Order · {formatMoney(lineTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
