import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Receipt, Pencil, Trash2, TrendingDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import {
  getExpenses, deleteExpense, summarizeExpenses, EXPENSE_CATEGORIES, type ExpenseRow,
} from '@/services/expenseService';
import { useAuthStore, selectCanAddExpenses } from '@/stores/authStore';
import { formatMoney, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { ExpenseModal } from './ExpenseModal';

export default function Expenses() {
  const canAdd = useAuthStore(selectCanAddExpenses);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editing, setEditing] = useState<ExpenseRow | null | 'new'>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  const summary = useMemo(() => summarizeExpenses(expenses), [expenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (q && !(e.note ?? '').toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [expenses, search, categoryFilter]);

  const topCategory = summary.byCategory[0];
  const secondCategory = summary.byCategory[1];

  return (
    <PageShell
      title="Expenses"
      subtitle="Log and track operational spending. Feeds directly into the P&L."
      action={
        canAdd ? (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caramel text-paper text-[12.5px] font-semibold hover:bg-caramel-dark transition-colors shadow-[0_2px_8px_rgba(164,124,88,0.3)]"
          >
            <Plus size={15} /> Add Expense
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Expenses" value={formatMoney(summary.total)} tone="dark" icon={<TrendingDown size={16} />} />
        <MetricCard label="This Month" value={formatMoney(summary.thisMonth)} detail="Manila calendar month" />
        <MetricCard
          label={topCategory ? topCategory.category : 'Top Category'}
          value={topCategory ? formatMoney(topCategory.amount) : '₱0.00'}
          detail="Highest spend"
        />
        <MetricCard
          label={secondCategory ? secondCategory.category : 'Next Category'}
          value={secondCategory ? formatMoney(secondCategory.amount) : '₱0.00'}
          detail="Second highest"
        />
      </div>

      <SectionPanel noPad>
        {/* Filters */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes or category…"
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
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Note</Th>
                <Th>Logged by</Th>
                <Th align="right">Amount</Th>
                {canAdd && <Th align="right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <Receipt size={30} className="mx-auto text-taupe/40" />
                    <p className="text-muted text-sm mt-3">
                      {expenses.length === 0 ? 'No expenses logged yet.' : 'Nothing matches your filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                    <td className="px-5 py-3 text-[12.5px] text-muted whitespace-nowrap">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-cream border border-line text-[11px] font-semibold text-espresso">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-dark-roast max-w-[280px] truncate">{e.note ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap">{e.actor_name}</td>
                    <td className="px-4 py-3 text-[13px] text-right font-semibold text-espresso whitespace-nowrap">
                      {formatMoney(e.amount)}
                    </td>
                    {canAdd && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <RowAction title="Edit" onClick={() => setEditing(e)} icon={<Pencil size={14} />} />
                          <RowAction
                            title="Delete"
                            danger
                            onClick={() => {
                              if (window.confirm(`Delete this ${e.category} expense of ${formatMoney(e.amount)}?`)) {
                                deleteMutation.mutate(e.id);
                              }
                            }}
                            icon={<Trash2 size={14} />}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-line bg-cream/30">
                  <td colSpan={4} className="px-5 py-3 text-[12px] font-bold uppercase tracking-wider text-muted">
                    {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-right font-bold text-espresso">
                    {formatMoney(filtered.reduce((s, e) => s + e.amount, 0))}
                  </td>
                  {canAdd && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </SectionPanel>

      {editing !== null && (
        <ExpenseModal expense={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </PageShell>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={cn(
      'px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-muted whitespace-nowrap first:px-5 last:px-5',
      align === 'right' && 'text-right', align === 'center' && 'text-center', align === 'left' && 'text-left'
    )}>
      {children}
    </th>
  );
}

function RowAction({ title, onClick, icon, danger }: { title: string; onClick: () => void; icon: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'w-8 h-8 rounded-lg grid place-items-center text-taupe border border-transparent hover:border-line transition-colors',
        danger ? 'hover:text-danger hover:bg-danger-soft' : 'hover:text-espresso hover:bg-cream'
      )}
    >
      {icon}
    </button>
  );
}
