import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, PackagePlus, SlidersHorizontal, Pencil, History, Boxes,
} from 'lucide-react';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import {
  getInventory, getInventoryCategories, getMovements,
  type InventoryRow, type MovementRow,
} from '@/services/inventoryService';
import { useAuthStore, selectIsManager } from '@/stores/authStore';
import { formatMoney, formatNumber, formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { StockInModal } from './StockInModal';
import { AdjustModal } from './AdjustModal';
import { ItemFormModal } from './ItemFormModal';

type Tab = 'stock' | 'movements';

const STATUS_BADGE: Record<InventoryRow['status'], { label: string; className: string }> = {
  ok: { label: 'In stock', className: 'bg-sage-soft text-sage border-sage/25' },
  low: { label: 'Low', className: 'bg-amber-soft text-amber border-amber/25' },
  out: { label: 'Out', className: 'bg-danger-soft text-danger border-danger/25' },
};

const MOVEMENT_BADGE: Record<string, { label: string; className: string }> = {
  sale: { label: 'Sale', className: 'bg-cream text-muted border-line' },
  stock_in: { label: 'Stock in', className: 'bg-sage-soft text-sage border-sage/25' },
  adjustment: { label: 'Adjustment', className: 'bg-amber-soft text-amber border-amber/25' },
  waste: { label: 'Waste', className: 'bg-danger-soft text-danger border-danger/25' },
  void_restore: { label: 'Void restore', className: 'bg-cream text-muted border-line' },
};

export default function Inventory() {
  const isManager = useAuthStore(selectIsManager);

  const { data: items = [], isLoading } = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const { data: categories = [] } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: getInventoryCategories,
  });
  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => getMovements(150),
  });

  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);

  const [stockInItem, setStockInItem] = useState<InventoryRow | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryRow | null>(null);
  const [formItem, setFormItem] = useState<InventoryRow | null | 'new'>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter !== 'all' && i.category_id !== categoryFilter) return false;
      if (lowOnly && i.status === 'ok') return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, categoryFilter, lowOnly]);

  const totals = useMemo(() => ({
    count: items.length,
    value: items.reduce((s, i) => s + i.stock_value, 0),
    low: items.filter((i) => i.status === 'low').length,
    out: items.filter((i) => i.status === 'out').length,
  }), [items]);

  return (
    <PageShell
      title="Inventory"
      subtitle="Track ingredients, packaging, and supplies. Every deduction and top-up is logged automatically."
      action={
        isManager ? (
          <button
            onClick={() => setFormItem('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caramel text-paper text-[12.5px] font-semibold hover:bg-caramel-dark transition-colors shadow-[0_2px_8px_rgba(164,124,88,0.3)]"
          >
            <Plus size={15} /> New Item
          </button>
        ) : undefined
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Items" value={String(totals.count)} icon={<Boxes size={16} />} />
        <MetricCard label="Inventory Value" value={formatMoney(totals.value)} tone="dark" />
        <MetricCard
          label="Low Stock"
          value={String(totals.low)}
          tone={totals.low > 0 ? 'warning' : 'default'}
          detail={totals.low > 0 ? 'Needs reordering soon' : 'All healthy'}
        />
        <MetricCard
          label="Out of Stock"
          value={String(totals.out)}
          tone={totals.out > 0 ? 'warning' : 'default'}
          detail={totals.out > 0 ? 'Products may be 86’d' : 'Nothing at zero'}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-full bg-cream border border-line w-fit">
        {(['stock', 'movements'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-4 rounded-full text-[12px] font-semibold transition-all',
              tab === t ? 'bg-dark-roast text-paper shadow-sm' : 'text-muted hover:text-espresso'
            )}
          >
            {t === 'stock' ? <Boxes size={13} /> : <History size={13} />}
            {t === 'stock' ? 'Stock Levels' : 'Movement History'}
          </button>
        ))}
      </div>

      {tab === 'stock' ? (
        <SectionPanel noPad>
          {/* Filters */}
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
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
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => setLowOnly((v) => !v)}
              className={cn(
                'h-9 px-3.5 rounded-lg border text-[12px] font-semibold transition-colors',
                lowOnly
                  ? 'bg-amber-soft border-amber/30 text-amber'
                  : 'bg-cream/50 border-line text-muted hover:text-espresso'
              )}
            >
              Needs attention {totals.low + totals.out > 0 && `(${totals.low + totals.out})`}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <Th>Item</Th>
                  <Th>Category</Th>
                  <Th align="right">On Hand</Th>
                  <Th align="right">Alert At</Th>
                  <Th align="right">Unit Cost</Th>
                  <Th align="right">Value</Th>
                  <Th align="center">Status</Th>
                  {isManager && <Th align="right">Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted text-sm">Loading…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted text-sm">
                      {items.length === 0 ? 'No inventory items yet.' : 'Nothing matches your filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors"
                    >
                      <td className="px-5 py-3 text-[13px] font-semibold text-dark-roast">{item.name}</td>
                      <td className="px-4 py-3 text-[12px] text-muted">{item.category_name}</td>
                      <td className={cn(
                        'px-4 py-3 text-[13px] text-right font-semibold',
                        item.status === 'out' ? 'text-danger' : item.status === 'low' ? 'text-amber' : 'text-dark-roast'
                      )}>
                        {formatNumber(item.current_stock, item.current_stock % 1 === 0 ? 0 : 2)}{' '}
                        <span className="text-[11px] text-muted font-normal">{item.unit_name}</span>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-right text-muted">
                        {formatNumber(item.low_stock_threshold)}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-right text-muted">
                        {formatMoney(item.unit_cost)}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-right font-medium text-espresso">
                        {formatMoney(item.stock_value)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded-full border text-[10.5px] font-bold',
                          STATUS_BADGE[item.status].className
                        )}>
                          {STATUS_BADGE[item.status].label}
                        </span>
                      </td>
                      {isManager && (
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <RowAction
                              title="Stock in"
                              onClick={() => setStockInItem(item)}
                              icon={<PackagePlus size={14} />}
                            />
                            <RowAction
                              title="Adjust"
                              onClick={() => setAdjustItem(item)}
                              icon={<SlidersHorizontal size={14} />}
                            />
                            <RowAction
                              title="Edit"
                              onClick={() => setFormItem(item)}
                              icon={<Pencil size={14} />}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      ) : (
        <SectionPanel noPad badge={`${movements.length} records`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <Th>When</Th>
                  <Th>Item</Th>
                  <Th align="center">Type</Th>
                  <Th align="right">Change</Th>
                  <Th>Note</Th>
                  <Th>By</Th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                      No stock movements yet. Sales, stock-ins, and adjustments will appear here.
                    </td>
                  </tr>
                ) : (
                  movements.map((m: MovementRow) => (
                    <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-3 text-[12px] text-muted whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-dark-roast">{m.item_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded-full border text-[10.5px] font-bold',
                          (MOVEMENT_BADGE[m.movement_type] ?? MOVEMENT_BADGE.sale).className
                        )}>
                          {(MOVEMENT_BADGE[m.movement_type] ?? MOVEMENT_BADGE.sale).label}
                        </span>
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-[13px] text-right font-semibold',
                        m.qty_change > 0 ? 'text-sage' : 'text-danger'
                      )}>
                        {m.qty_change > 0 ? '+' : ''}{formatNumber(m.qty_change, m.qty_change % 1 === 0 ? 0 : 2)}{' '}
                        <span className="text-[11px] text-muted font-normal">{m.unit_name}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted max-w-[220px] truncate">{m.note ?? '—'}</td>
                      <td className="px-5 py-3 text-[12px] text-muted whitespace-nowrap">{m.actor_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      )}

      {/* Modals */}
      {stockInItem && <StockInModal item={stockInItem} onClose={() => setStockInItem(null)} />}
      {adjustItem && <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} />}
      {formItem !== null && (
        <ItemFormModal item={formItem === 'new' ? null : formItem} onClose={() => setFormItem(null)} />
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
