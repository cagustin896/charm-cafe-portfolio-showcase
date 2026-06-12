import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Package, ArrowRight, ReceiptText,
} from 'lucide-react';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import { TrendChart } from '@/components/ui/TrendChart';
import { getAnalytics, lastNDaysRange } from '@/services/analyticsService';
import { getInventory } from '@/services/inventoryService';
import { getOrders } from '@/services/salesService';
import { useAuthStore } from '@/stores/authStore';
import { formatMoney, formatTime, todayLabel, todayInManila } from '@/utils/format';
import { cn } from '@/utils/cn';

function greeting(): string {
  const h = todayInManila().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const { data: today } = useQuery({
    queryKey: ['analytics', 'today'],
    queryFn: () => getAnalytics('today'),
  });
  const fortnight = lastNDaysRange(14);
  const { data: trendData } = useQuery({
    queryKey: ['analytics', 'dashboard-trend', fortnight.startKey],
    queryFn: () => getAnalytics('custom', fortnight.startKey, fortnight.endKey),
  });
  const { data: inventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => getOrders(6),
  });

  const s = today?.summary;
  const attention = inventory
    .filter((i) => i.status !== 'ok')
    .sort((a, b) => (a.status === 'out' ? -1 : 1) - (b.status === 'out' ? -1 : 1))
    .slice(0, 5);
  const attentionCount = inventory.filter((i) => i.status !== 'ok').length;

  return (
    <PageShell
      title={`${greeting()}, ${firstName}`}
      subtitle={`${todayLabel()} · Here's how the cafe is doing today.`}
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <MetricCard label="Revenue Today" value={s ? formatMoney(s.revenue) : '—'} tone="dark" icon={<DollarSign size={16} />} />
        <MetricCard label="Orders Today" value={s ? String(s.orders) : '—'} icon={<ShoppingCart size={16} />} />
        <MetricCard label="Avg Order" value={s ? formatMoney(s.aov) : '—'} icon={<TrendingUp size={16} />} />
        <MetricCard
          label="Gross Profit"
          value={s ? formatMoney(s.grossProfit) : '—'}
          tone="success"
          detail={s && s.revenue > 0 ? `${Math.round((s.grossProfit / s.revenue) * 100)}% margin` : undefined}
        />
        <MetricCard
          label="Stock Alerts"
          value={String(attentionCount)}
          tone={attentionCount > 0 ? 'warning' : 'default'}
          detail={attentionCount > 0 ? 'Items need attention' : 'Stock is healthy'}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">

        {/* Left column */}
        <div className="flex flex-col gap-4">
          <SectionPanel title="Revenue Trend" badge="Last 14 days">
            <TrendChart data={trendData?.trend ?? []} height={200} />
          </SectionPanel>

          {/* Recent orders */}
          <SectionPanel
            title="Recent Orders"
            noPad
            action={
              <Link to="/analytics" className="text-[11.5px] font-semibold text-caramel hover:text-espresso transition-colors">
                View analytics →
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ReceiptText size={26} className="mx-auto text-taupe/40" />
                <p className="text-muted text-[12.5px] mt-3">No orders yet today — open the POS to start selling.</p>
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {recentOrders.map((o) => {
                  const itemCount = (o.items ?? []).reduce((s2, i) => s2 + (i.is_voided ? 0 : i.quantity), 0);
                  return (
                    <div key={o.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-dark-roast">
                          {o.order_no}
                          <span className="ml-2 text-[10.5px] font-bold uppercase text-taupe">{o.payment_method}</span>
                        </p>
                        <p className="text-[11.5px] text-muted mt-0.5">
                          {formatTime(o.created_at)} · {itemCount} {itemCount === 1 ? 'item' : 'items'} · {o.order_type === 'dine-in' ? 'Dine in' : 'Take out'}
                        </p>
                      </div>
                      <p className="font-heading text-[15px] font-semibold text-espresso">{formatMoney(o.total)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionPanel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Stock alerts */}
          <SectionPanel
            title="Low Stock Alerts"
            badge={`${attentionCount} ${attentionCount === 1 ? 'item' : 'items'}`}
            noPad
            action={
              <Link to="/inventory" className="text-[11.5px] font-semibold text-caramel hover:text-espresso transition-colors">
                Inventory →
              </Link>
            }
          >
            {attention.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Package size={26} className="mx-auto text-taupe/40" />
                <p className="text-muted text-[12.5px] mt-2">All stocked up — nothing needs attention.</p>
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {attention.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-[12.5px] font-semibold text-dark-roast">{item.name}</p>
                      <p className="text-[11px] text-muted">
                        {item.current_stock} {item.unit_name} left · alert at {item.low_stock_threshold}
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full border text-[10px] font-bold',
                      item.status === 'out'
                        ? 'bg-danger-soft text-danger border-danger/25'
                        : 'bg-amber-soft text-amber border-amber/25'
                    )}>
                      {item.status === 'out' ? 'Out' : 'Low'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>

          {/* Top products today */}
          <SectionPanel title="Top Sellers Today" noPad>
            {(today?.topProducts ?? []).length === 0 ? (
              <p className="text-muted text-[12.5px] text-center px-5 py-8">No sales yet today.</p>
            ) : (
              <div className="divide-y divide-line/60">
                {(today?.topProducts ?? []).slice(0, 5).map((p, i) => (
                  <div key={`${p.name}-${p.size}`} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-5 text-[12px] font-bold text-caramel">{i + 1}</span>
                    <p className="flex-1 text-[12.5px] font-medium text-dark-roast truncate">
                      {p.name}{p.size !== 'Regular' && <span className="text-muted"> · {p.size}</span>}
                    </p>
                    <span className="text-[11.5px] text-muted">×{p.qty}</span>
                    <span className="text-[12.5px] font-semibold text-espresso">{formatMoney(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>

          {/* Quick actions */}
          <SectionPanel title="Quick Actions">
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'New Sale', sub: 'Open the POS', to: '/pos' },
                { label: 'Stock In', sub: 'Receive a delivery', to: '/inventory' },
                { label: 'Add Expense', sub: 'Log a cost', to: '/expenses' },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-cream hover:bg-sand/20 border border-line transition-colors group"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-espresso">{action.label}</p>
                    <p className="text-[11px] text-muted">{action.sub}</p>
                  </div>
                  <ArrowRight size={15} className="text-caramel opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </SectionPanel>
        </div>
      </div>
    </PageShell>
  );
}
