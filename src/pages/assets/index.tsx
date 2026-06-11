import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import { getAssets, deleteAsset, avgDailyGrossProfit } from '@/services/assetService';
import { useAuthStore, selectIsManager } from '@/stores/authStore';
import { formatMoney, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Asset } from '@/types';
import { AssetModal } from './AssetModal';

export default function Assets() {
  const isManager = useAuthStore(selectIsManager);
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({ queryKey: ['assets'], queryFn: getAssets });
  const { data: dailyGP = 0 } = useQuery({
    queryKey: ['avg-daily-gp'],
    queryFn: async () => avgDailyGrossProfit(),
  });

  const [editing, setEditing] = useState<Asset | null | 'new'>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset removed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  const totalValue = useMemo(() => assets.reduce((s, a) => s + a.purchase_price, 0), [assets]);
  const paybackDays = dailyGP > 0 ? Math.ceil(totalValue / dailyGP) : null;

  return (
    <PageShell
      title="Assets"
      subtitle="Equipment and fixtures. Tracks total investment and estimated payback from daily gross profit."
      action={
        isManager ? (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caramel text-paper text-[12.5px] font-semibold hover:bg-caramel-dark transition-colors shadow-[0_2px_8px_rgba(164,124,88,0.3)]"
          >
            <Plus size={15} /> Add Asset
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Total Assets" value={String(assets.length)} icon={<Wrench size={16} />} />
        <MetricCard label="Asset Value" value={formatMoney(totalValue)} tone="dark" />
        <MetricCard
          label="Est. Payback"
          value={paybackDays != null ? `${paybackDays} ${paybackDays === 1 ? 'day' : 'days'}` : '—'}
          tone="success"
          detail={
            dailyGP > 0
              ? `At ${formatMoney(dailyGP)}/day gross profit`
              : 'Needs sales data to estimate'
          }
        />
      </div>

      <SectionPanel noPad>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <Th>Asset</Th>
                <Th>Purchased</Th>
                <Th>Note</Th>
                <Th align="right">Price</Th>
                <Th align="right">% of Total</Th>
                {isManager && <Th align="right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">Loading…</td></tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <Wrench size={30} className="mx-auto text-taupe/40" />
                    <p className="text-muted text-sm mt-3">No assets yet — add your equipment and fixtures.</p>
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.id} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-semibold text-dark-roast">{a.name}</td>
                    <td className="px-4 py-3 text-[12.5px] text-muted whitespace-nowrap">
                      {a.purchase_date ? formatDate(a.purchase_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted max-w-[260px] truncate">{a.note ?? '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-right font-semibold text-espresso whitespace-nowrap">
                      {formatMoney(a.purchase_price)}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-right text-muted">
                      {totalValue > 0 ? `${Math.round((a.purchase_price / totalValue) * 100)}%` : '—'}
                    </td>
                    {isManager && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <RowAction title="Edit" onClick={() => setEditing(a)} icon={<Pencil size={14} />} />
                          <RowAction
                            title="Delete"
                            danger
                            onClick={() => {
                              if (window.confirm(`Remove "${a.name}" from the asset register?`)) {
                                deleteMutation.mutate(a.id);
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
            {assets.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-line bg-cream/30">
                  <td colSpan={3} className="px-5 py-3 text-[12px] font-bold uppercase tracking-wider text-muted">
                    Total investment
                  </td>
                  <td className="px-4 py-3 text-[14px] text-right font-bold text-espresso">{formatMoney(totalValue)}</td>
                  <td />
                  {isManager && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </SectionPanel>

      {paybackDays != null && (
        <div className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-sage-soft border border-sage/25 text-sage text-[12.5px]">
          <TrendingUp size={15} className="flex-none" />
          <span>
            At the current average of <strong>{formatMoney(dailyGP)}</strong> gross profit per selling day,
            your equipment pays for itself in about <strong>{paybackDays} {paybackDays === 1 ? 'day' : 'days'}</strong>.
          </span>
        </div>
      )}

      {editing !== null && (
        <AssetModal asset={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
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
