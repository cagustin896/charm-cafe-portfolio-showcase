import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CupSoda, History } from 'lucide-react';
import { getCatalog, type Catalog } from '@/services/catalogService';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useCartStore } from '@/stores/cartStore';
import { ProductImage } from '@/components/ui/ProductImage';
import type { Product } from '@/types';
import { ItemModal } from './ItemModal';
import { CartPanel } from './CartPanel';
import { RecentOrdersModal } from './RecentOrdersModal';

export default function POS() {
  const { data: catalog, isLoading, isError } = useQuery({
    queryKey: ['catalog'],
    queryFn: getCatalog,
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);

  const filteredProducts = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.products.filter((p) => {
      if (!p.is_available) return false; // hidden by manager — not on the POS at all
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, categoryFilter, search]);

  function countFor(categoryId: string | 'all'): number {
    if (!catalog) return 0;
    const visible = catalog.products.filter((p) => p.is_available);
    if (categoryId === 'all') return visible.length;
    return visible.filter((p) => p.category_id === categoryId).length;
  }

  /** A product is sellable if at least one variant passes the Auto-86 check. */
  function productCanSell(product: Product, cat: Catalog): boolean {
    return (product.variants ?? []).some((v) => cat.availability.get(v.id)?.can_sell);
  }

  function isFood(product: Product, cat: Catalog): boolean {
    const category = cat.categories.find((c) => c.id === product.category_id);
    return category?.name === 'Food';
  }

  function handleProductClick(product: Product) {
    if (!catalog) return;
    const variants = (product.variants ?? []).filter((v) => v.is_active);

    // Single-size food with no add-ons: add instantly for speed
    if (variants.length === 1 && isFood(product, catalog)) {
      const v = variants[0];
      if (!catalog.availability.get(v.id)?.can_sell) return;
      addItem({
        variantId: v.id,
        productName: product.name,
        sizeLabel: v.size_label,
        basePrice: v.price,
        addOns: [],
      });
      return;
    }

    setModalProduct(product);
  }

  if (isLoading) {
    return (
      <div className="h-full grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-caramel border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm font-medium">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (isError || !catalog) {
    return (
      <div className="h-full grid place-items-center">
        <div className="text-center">
          <p className="text-danger font-semibold">Couldn't load the menu.</p>
          <p className="text-muted text-sm mt-1">Try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex min-h-0">

      {/* ── Catalog ── */}
      <section className="flex-1 min-w-0 flex flex-col">

        {/* Search + categories */}
        <div className="flex-none px-6 pt-5 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-semibold text-espresso flex-none">Point of Sale</h1>
            <button
              onClick={() => setOrdersOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-line bg-paper text-[12px] font-semibold text-muted hover:text-espresso hover:border-caramel transition-colors flex-none"
            >
              <History size={13} /> Orders
            </button>
            <div className="relative flex-1 max-w-[320px] ml-auto">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu…"
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-full border bg-cream/60 text-dark-roast text-[13px] placeholder:text-faint',
                  'outline-none transition-all border-line focus:border-caramel focus:shadow-[0_0_0_3px_rgba(164,124,88,0.12)]'
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CategoryChip
              label="All"
              count={countFor('all')}
              active={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
            />
            {catalog.categories.map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                count={countFor(c.id)}
                active={categoryFilter === c.id}
                onClick={() => setCategoryFilter(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredProducts.length === 0 ? (
            <div className="h-full grid place-items-center">
              <div className="text-center">
                <CupSoda size={28} className="mx-auto text-taupe/50" />
                <p className="text-muted text-sm mt-3 font-medium">No products match your search.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const canSell = productCanSell(product, catalog);
                const variants = (product.variants ?? []).filter((v) => v.is_active);
                const categoryName = catalog.categories.find((c) => c.id === product.category_id)?.name ?? '';
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    disabled={!canSell}
                    className={cn(
                      'group relative text-left rounded-xl border overflow-hidden flex flex-col transition-all',
                      canSell
                        ? 'bg-paper border-line hover:border-caramel hover:shadow-[0_4px_16px_rgba(164,124,88,0.15)] active:scale-[0.98]'
                        : 'bg-cream/50 border-line opacity-60 cursor-not-allowed'
                    )}
                  >
                    {/* Photo */}
                    <div className="relative w-full aspect-[4/3] bg-cream overflow-hidden">
                      <ProductImage src={product.image_url} alt={product.name} iconSize={36} />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-paper/90 backdrop-blur-sm text-caramel text-[9.5px] font-bold uppercase tracking-wider border border-line/60">
                        {categoryName}
                      </span>
                      {!canSell && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-danger-soft text-danger text-[10px] font-bold border border-danger/20">
                          86'd
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 p-3">
                      <span className="font-heading text-[14.5px] font-semibold text-dark-roast leading-snug">
                        {product.name}
                      </span>
                      <span className="mt-auto pt-2 text-[12.5px] text-muted">
                        {variants.map((v, i) => (
                          <span key={v.id}>
                            {i > 0 && <span className="text-faint"> · </span>}
                            {variants.length > 1 && <span className="text-faint">{v.size_label} </span>}
                            <span className="font-semibold text-espresso">{formatMoney(v.price)}</span>
                          </span>
                        ))}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Cart ── */}
      <CartPanel catalog={catalog} />

      {/* ── Item modal ── */}
      {modalProduct && (
        <ItemModal
          product={modalProduct}
          catalog={catalog}
          showAddOns={!isFood(modalProduct, catalog)}
          onClose={() => setModalProduct(null)}
        />
      )}

      {/* ── Order history ── */}
      {ordersOpen && <RecentOrdersModal onClose={() => setOrdersOpen(false)} />}
    </div>
  );
}

function CategoryChip({
  label, count, active, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12px] font-semibold border transition-all',
        active
          ? 'bg-dark-roast text-paper border-dark-roast shadow-sm'
          : 'bg-paper text-muted border-line hover:border-caramel hover:text-espresso'
      )}
    >
      {label}
      <span
        className={cn(
          'text-[10px] font-bold px-1.5 py-px rounded-full',
          active ? 'bg-white/15 text-paper' : 'bg-cream text-taupe'
        )}
      >
        {count}
      </span>
    </button>
  );
}
