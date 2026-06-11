import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, ShoppingCart, ArrowRight, ReceiptText, Coffee } from 'lucide-react';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import { getOrders } from '@/services/salesService';
import { getClockStatus, getTimeLogs } from '@/services/timeService';
import { useAuthStore } from '@/stores/authStore';
import {
  formatMoney, formatTime, formatHours, todayLabel, manilaDateKey, todayKey, todayInManila,
} from '@/utils/format';

function greeting(): string {
  const h = todayInManila().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function StaffDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const { data: orders = [] } = useQuery({ queryKey: ['orders', 'recent-100'], queryFn: () => getOrders(100) });
  const { data: clockStatus = [] } = useQuery({ queryKey: ['clock-status'], queryFn: getClockStatus });
  const { data: timeLogs = [] } = useQuery({ queryKey: ['time-logs'], queryFn: () => getTimeLogs(200) });

  const today = todayKey();
  const myOrders = orders.filter(
    (o) => o.created_by === profile?.id && manilaDateKey(o.created_at) === today
  );
  const myRevenue = myOrders.reduce((s, o) => s + o.total, 0);

  const me = clockStatus.find((c) => c.id === profile?.id);
  const clockedIn = !!me?.open_log_id;

  // Hours today = completed shifts today + live elapsed time on an open shift
  const completedToday = timeLogs
    .filter((l) => l.profile_id === profile?.id && l.clock_out && manilaDateKey(l.clock_in) === today)
    .reduce((s, l) => s + (l.hours_worked ?? 0), 0);
  const liveHours =
    clockedIn && me?.clocked_in_at
      ? (Date.now() - new Date(me.clocked_in_at).getTime()) / 3600000
      : 0;
  const hoursToday = completedToday + liveHours;

  return (
    <PageShell title={`${greeting()}, ${firstName}!`} subtitle={`${todayLabel()} · Have a great shift.`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <MetricCard
          label="Clock Status"
          value={clockedIn ? 'Clocked In' : 'Clocked Out'}
          tone={clockedIn ? 'success' : 'warning'}
          detail={clockedIn && me?.clocked_in_at ? `Since ${formatTime(me.clocked_in_at)}` : 'Use Clock In / Out'}
          icon={<Clock size={16} />}
        />
        <MetricCard
          label="Hours Today"
          value={hoursToday > 0 ? formatHours(hoursToday) : '0m'}
          detail={clockedIn ? 'Still counting' : undefined}
        />
        <MetricCard
          label="My Sales Today"
          value={String(myOrders.length)}
          detail={myOrders.length > 0 ? `${formatMoney(myRevenue)} rung up` : 'No orders yet'}
          icon={<ShoppingCart size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">

        {/* My recent orders */}
        <SectionPanel title="My Orders Today" badge={`${myOrders.length}`} noPad>
          {myOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ReceiptText size={28} className="mx-auto text-taupe/40" />
              <p className="text-muted text-[12.5px] mt-3">Nothing rung up yet — open the POS to take your first order.</p>
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {myOrders.slice(0, 8).map((o) => {
                const itemCount = (o.items ?? []).reduce((s, i) => s + (i.is_voided ? 0 : i.quantity), 0);
                return (
                  <div key={o.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-dark-roast">
                        {o.order_no}
                        <span className="ml-2 text-[10.5px] font-bold uppercase text-taupe">{o.payment_method}</span>
                      </p>
                      <p className="text-[11.5px] text-muted mt-0.5">
                        {formatTime(o.created_at)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <p className="font-heading text-[15px] font-semibold text-espresso">{formatMoney(o.total)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>

        {/* Quick links */}
        <div className="flex flex-col gap-4">
          <SectionPanel title="Quick Links">
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'Open POS', sub: 'Start taking orders', to: '/pos', icon: Coffee },
                { label: 'Clock In / Out', sub: 'Record your time', to: '/clock-in', icon: Clock },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="flex items-center justify-between px-5 py-4 rounded-xl bg-cream hover:bg-sand/20 border border-line transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-caramel/15 border border-caramel/25 grid place-items-center text-caramel">
                      <link.icon size={16} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-espresso">{link.label}</p>
                      <p className="text-[12px] text-muted mt-0.5">{link.sub}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-caramel opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </SectionPanel>
        </div>
      </div>
    </PageShell>
  );
}
