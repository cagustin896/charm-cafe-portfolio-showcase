import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Banknote, Smartphone, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import { TrendChart } from '@/components/ui/TrendChart';
import {
  getAnalytics, resolveRange, exportOrdersCsv,
} from '@/services/analyticsService';
import type { AnalyticsPeriod } from '@/types';
import { formatMoney, formatNumber, todayKey } from '@/utils/format';
import { cn } from '@/utils/cn';

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

export default function Analytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [customStart, setCustomStart] = useState(todayKey());
  const [customEnd, setCustomEnd] = useState(todayKey());

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period, customStart, customEnd],
    queryFn: () => getAnalytics(period, customStart, customEnd),
  });

  function handleExport() {
    const { startKey, endKey } = resolveRange(period, customStart, customEnd);
    const count = exportOrdersCsv(startKey, endKey);
    if (count === 0) toast.info('No orders in this period to export.');
    else toast.success(`Exported ${count} order${count === 1 ? '' : 's'} to CSV`);
  }

  const s = data?.summary;
  const maxCategory = Math.max(1, ...(data?.categorySplit ?? []).map((c) => c.revenue));

  return (
    <PageShell
      title="Analytics & Reports"
      subtitle="Sales performance, profit & loss, product movement, and payment mix — all in Manila time."
      action={
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-line bg-paper text-espresso text-[12.5px] font-semibold hover:border-caramel hover:bg-cream transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      }
    >
      {/* Period picker */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-full bg-cream border border-line">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                'h-8 px-3.5 rounded-full text-[12px] font-semibold transition-all',
                period === p.id ? 'bg-dark-roast text-paper shadow-sm' : 'text-muted hover:text-espresso'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 px-3 rounded-lg border border-line bg-cream/50 text-[12px] text-dark-roast outline-none focus:border-caramel"
              aria-label="Start date"
            />
            <span className="text-muted text-[12px]">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 px-3 rounded-lg border border-line bg-cream/50 text-[12px] text-dark-roast outline-none focus:border-caramel"
              aria-label="End date"
            />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <MetricCard label="Revenue" value={s ? formatMoney(s.revenue) : '—'} tone="dark" />
        <MetricCard label="Orders" value={s ? String(s.orders) : '—'} />
        <MetricCard label="Avg Order" value={s ? formatMoney(s.aov) : '—'} />
        <MetricCard label="COGS" value={s ? formatMoney(s.cogs) : '—'} detail="Ingredient cost incl. add-ons" />
        <MetricCard
          label="Gross Profit"
          value={s ? formatMoney(s.grossProfit) : '—'}
          tone="success"
          detail={s && s.revenue > 0 ? `${Math.round((s.grossProfit / s.revenue) * 100)}% margin` : undefined}
        />
      </div>

      {/* Trend */}
      <SectionPanel title="Revenue Trend" badge={PERIODS.find((p) => p.id === period)?.label}>
        {isLoading ? (
          <div className="h-[220px] grid place-items-center">
            <div className="w-7 h-7 border-2 border-caramel border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TrendChart data={data?.trend ?? []} />
        )}
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 mt-4">

        {/* Top products */}
        <SectionPanel title="Top Products" badge="by revenue" noPad>
          {(data?.topProducts ?? []).length === 0 ? (
            <div className="px-5 py-12 text-center">
              <BarChart2 size={28} className="mx-auto text-taupe/40" />
              <p className="text-muted text-sm mt-3">No sales in this period.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted">#</th>
                  <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-muted">Product</th>
                  <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-muted">Sold</th>
                  <th className="px-5 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-muted">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topProducts ?? []).map((p, i) => (
                  <tr key={`${p.name}-${p.size}`} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                    <td className="px-5 py-3 text-[12px] font-bold text-caramel">{i + 1}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-dark-roast">
                      {p.name}
                      {p.size !== 'Regular' && <span className="text-muted text-[11.5px]"> · {p.size}</span>}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-right text-muted">{formatNumber(p.qty)}</td>
                    <td className="px-5 py-3 text-[13px] text-right font-semibold text-espresso">{formatMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionPanel>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* P&L */}
          <SectionPanel title="Profit & Loss">
            <div className="space-y-2 text-[13px]">
              <PnlRow label="Revenue" value={s?.revenue ?? 0} />
              <PnlRow label="Cost of goods" value={-(s?.cogs ?? 0)} muted />
              <div className="border-t border-dashed border-line pt-2">
                <PnlRow label="Gross profit" value={s?.grossProfit ?? 0} bold />
              </div>
              <PnlRow label="Expenses" value={-(s?.expenses ?? 0)} muted />
              <div className="border-t border-line pt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-heading text-[15px] font-semibold text-espresso">Net</span>
                  <span className={cn(
                    'font-heading text-[19px] font-semibold',
                    (s?.net ?? 0) >= 0 ? 'text-sage' : 'text-danger'
                  )}>
                    {formatMoney(s?.net ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </SectionPanel>

          {/* Payment split */}
          <SectionPanel title="Payment Mix">
            {(data?.paymentSplit ?? []).length === 0 ? (
              <p className="text-muted text-[12.5px] text-center py-4">No payments yet.</p>
            ) : (
              <div className="space-y-3">
                {(data?.paymentSplit ?? []).map((p) => {
                  const pct = s && s.revenue > 0 ? (p.amount / s.revenue) * 100 : 0;
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className="flex items-center gap-1.5 font-semibold text-dark-roast capitalize">
                          {p.method === 'cash' ? <Banknote size={13} className="text-caramel" /> : <Smartphone size={13} className="text-caramel" />}
                          {p.method} <span className="text-muted font-normal">· {p.count} {p.count === 1 ? 'order' : 'orders'}</span>
                        </span>
                        <span className="font-semibold text-espresso">{formatMoney(p.amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-cream overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-caramel to-espresso"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionPanel>

          {/* Category mix */}
          <SectionPanel title="Category Mix">
            {(data?.categorySplit ?? []).length === 0 ? (
              <p className="text-muted text-[12.5px] text-center py-4">No sales yet.</p>
            ) : (
              <div className="space-y-3">
                {(data?.categorySplit ?? []).map((c) => (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <span className="font-semibold text-dark-roast">{c.category}</span>
                      <span className="font-semibold text-espresso">{formatMoney(c.revenue)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-cream overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sand to-caramel"
                        style={{ width: `${Math.max(2, (c.revenue / maxCategory) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>
      </div>
    </PageShell>
  );
}

function PnlRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={cn(muted ? 'text-muted' : 'text-dark-roast', bold && 'font-semibold')}>{label}</span>
      <span className={cn(
        'tabular-nums',
        bold ? 'font-semibold text-espresso' : muted ? 'text-muted' : 'text-dark-roast'
      )}>
        {value < 0 ? `−${formatMoney(Math.abs(value))}` : formatMoney(value)}
      </span>
    </div>
  );
}
