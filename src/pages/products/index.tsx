import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Coffee, Sparkles, Pencil, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import { getCatalog, type Catalog } from '@/services/catalogService';
import { getInventory } from '@/services/inventoryService';
import { setProductAvailability, recipeCost } from '@/services/productService';
import { useAuthStore, selectIsManager } from '@/stores/authStore';
import type { Product, AddOn } from '@/types';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { ProductEditor } from './ProductEditor';
import { AddOnEditor } from './AddOnEditor';

type Tab = 'products' | 'addons';

type ProductStatus = 'available' | '86d' | 'hidden';

function productStatus(product: Product, catalog: Catalog): ProductStatus {
  if (!product.is_available) return 'hidden';
  const sellable = (product.variants ?? []).some((v) => catalog.availability.get(v.id)?.can_sell);
  return sellable ? 'available' : '86d';
}

const STATUS_BADGE: Record<ProductStatus, { label: string; className: string }> = {
  available: { label: 'On menu', className: 'bg-sage-soft text-sage border-sage/25' },
  '86d': { label: "86'd", className: 'bg-danger-soft text-danger border-danger/25' },
  hidden: { label: 'Hidden', className: 'bg-cream text-muted border-line' },
};

export default function Products() {
  const isManager = useAuthStore(selectIsManager);
  const queryClient = useQueryClient();

  const { data: catalog, isLoading } = useQuery({ queryKey: ['catalog'], queryFn: getCatalog });
  const { data: inventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: getInventory });

  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editorProduct, setEditorProduct] = useState<Product | null | 'new'>(null);
  const [editorAddOn, setEditorAddOn] = useState<AddOn | null | 'new'>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) =>
      setProductAvailability(id, available),
    onSuccess: (_, { available }) => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(available ? 'Back on the menu' : 'Hidden from the menu');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  const products = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.products.filter((p) => {
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, search, categoryFilter]);

  const stats = useMemo(() => {
    if (!catalog) return { total: 0, onMenu: 0, eightySixed: 0, addOns: 0 };
    let onMenu = 0;
    let eightySixed = 0;
    for (const p of catalog.products) {
      const s = productStatus(p, catalog);
      if (s === 'available') onMenu += 1;
      if (s === '86d') eightySixed += 1;
    }
    return {
      total: catalog.products.length,
      onMenu,
      eightySixed,
      addOns: catalog.addOns.length,
    };
  }, [catalog]);

  return (
    <PageShell
      title="Products"
      subtitle="Menu items, sizes, pricing, and the recipes that drive stock deduction and availability."
      action={
        isManager ? (
          <button
            onClick={() => (tab === 'products' ? setEditorProduct('new') : setEditorAddOn('new'))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caramel text-paper text-[12.5px] font-semibold hover:bg-caramel-dark transition-colors shadow-[0_2px_8px_rgba(164,124,88,0.3)]"
          >
            <Plus size={15} /> {tab === 'products' ? 'New Product' : 'New Add-on'}
          </button>
        ) : undefined
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Menu Items" value={String(stats.total)} icon={<Coffee size={16} />} />
        <MetricCard label="On the Menu" value={String(stats.onMenu)} tone="default" detail="Sellable right now" />
        <MetricCard
          label="86'd by Stock"
          value={String(stats.eightySixed)}
          tone={stats.eightySixed > 0 ? 'warning' : 'default'}
          detail={stats.eightySixed > 0 ? 'Missing ingredients' : 'Everything sellable'}
        />
        <MetricCard label="Add-ons" value={String(stats.addOns)} icon={<Sparkles size={16} />} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-full bg-cream border border-line w-fit">
        {(['products', 'addons'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-4 rounded-full text-[12px] font-semibold transition-all',
              tab === t ? 'bg-dark-roast text-paper shadow-sm' : 'text-muted hover:text-espresso'
            )}
          >
            {t === 'products' ? <Coffee size={13} /> : <Sparkles size={13} />}
            {t === 'products' ? 'Menu Items' : 'Add-ons'}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <SectionPanel noPad>
          {/* Filters */}
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-cream/50 text-[12.5px] text-dark-roast placeholder:text-faint outline-none focus:border-caramel"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-line bg-cream/50 text-[12px] font-medium text-dark-roast outline-none focus:border-caramel"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {(catalog?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th>Sizes & Prices</Th>
                  <Th align="right">Cost → Margin</Th>
                  <Th align="center">Status</Th>
                  {isManager && <Th align="right">Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">Loading…</td></tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                      {catalog?.products.length === 0 ? 'No products yet — create your first menu item.' : 'Nothing matches your filters.'}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const status = catalog ? productStatus(product, catalog) : 'available';
                    const categoryName =
                      catalog?.categories.find((c) => c.id === product.category_id)?.name ?? '—';
                    const variants = (product.variants ?? []).filter((v) => v.is_active);
                    const first = variants[0];
                    const firstCost = first
                      ? recipeCost(
                          (first.recipe_items ?? []).map((r) => ({
                            inventory_item_id: r.inventory_item_id,
                            qty_per_sale: r.qty_per_sale,
                          })),
                          inventory
                        )
                      : 0;
                    return (
                      <tr key={product.id} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-semibold text-dark-roast">{product.name}</p>
                          {product.description && (
                            <p className="text-[11px] text-muted mt-0.5 max-w-[260px] truncate">{product.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted">{categoryName}</td>
                        <td className="px-4 py-3 text-[12.5px] text-dark-roast whitespace-nowrap">
                          {variants.map((v, i) => (
                            <span key={v.id}>
                              {i > 0 && <span className="text-faint"> · </span>}
                              {variants.length > 1 && <span className="text-muted">{v.size_label} </span>}
                              <span className="font-semibold">{formatMoney(v.price)}</span>
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-right whitespace-nowrap">
                          {first ? (
                            <>
                              <span className="text-muted">{formatMoney(firstCost)}</span>
                              <span className="text-faint"> → </span>
                              <span className={cn('font-semibold', first.price - firstCost >= 0 ? 'text-sage' : 'text-danger')}>
                                {formatMoney(first.price - firstCost)}
                              </span>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-full border text-[10.5px] font-bold',
                            STATUS_BADGE[status].className
                          )}>
                            {STATUS_BADGE[status].label}
                          </span>
                        </td>
                        {isManager && (
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <RowAction
                                title={product.is_available ? 'Hide from menu' : 'Show on menu'}
                                onClick={() =>
                                  toggleMutation.mutate({ id: product.id, available: !product.is_available })
                                }
                                icon={product.is_available ? <EyeOff size={14} /> : <Eye size={14} />}
                              />
                              <RowAction
                                title="Edit"
                                onClick={() => setEditorProduct(product)}
                                icon={<Pencil size={14} />}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      ) : (
        <SectionPanel noPad badge={`${catalog?.addOns.length ?? 0} active`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <Th>Add-on</Th>
                  <Th align="right">Price</Th>
                  <Th>Deducts</Th>
                  {isManager && <Th align="right">Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {(catalog?.addOns ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted text-sm">
                      No add-ons yet — create extras like jellies or syrup shots.
                    </td>
                  </tr>
                ) : (
                  (catalog?.addOns ?? []).map((addOn) => {
                    const recipeText = (addOn.recipe_items ?? [])
                      .map((r) => {
                        const item = inventory.find((i) => i.id === r.inventory_item_id);
                        return item ? `${r.qty_per_sale} ${item.unit_name} ${item.name}` : null;
                      })
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <tr key={addOn.id} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                        <td className="px-5 py-3 text-[13px] font-semibold text-dark-roast">{addOn.name}</td>
                        <td className="px-4 py-3 text-[13px] text-right font-semibold text-espresso">
                          {formatMoney(addOn.price)}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted max-w-[300px] truncate">
                          {recipeText || 'No stock deduction'}
                        </td>
                        {isManager && (
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end">
                              <RowAction
                                title="Edit"
                                onClick={() => setEditorAddOn(addOn)}
                                icon={<Pencil size={14} />}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      )}

      {/* Editors */}
      {editorProduct !== null && (
        <ProductEditor
          product={editorProduct === 'new' ? null : editorProduct}
          categories={catalog?.categories ?? []}
          onClose={() => setEditorProduct(null)}
        />
      )}
      {editorAddOn !== null && (
        <AddOnEditor
          addOn={editorAddOn === 'new' ? null : editorAddOn}
          onClose={() => setEditorAddOn(null)}
        />
      )}
    </PageShell>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={cn(
      'px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-muted whitespace-nowrap first:px-5 last:px-5',
      align === 'right' && 'text-right',
      align === 'center' && 'text-center',
      align === 'left' && 'text-left'
    )}>
      {children}
    </th>
  );
}

function RowAction({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-espresso hover:bg-cream border border-transparent hover:border-line transition-colors"
    >
      {icon}
    </button>
  );
}
