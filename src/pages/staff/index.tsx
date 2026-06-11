import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Users, Pencil, Clock, Wallet, CheckCircle2, Trash2, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, MetricCard, SectionPanel } from '@/components/ui/PageShell';
import { getStaff, type StaffRow } from '@/services/staffService';
import { getClockStatus } from '@/services/timeService';
import { getTimeLogs, deleteTimeLog } from '@/services/timeService';
import {
  getPayrollPeriods, markPeriodPaid, deletePeriod, sumAdjustments,
} from '@/services/payrollService';
import { useAuthStore } from '@/stores/authStore';
import type { PayrollPeriod } from '@/types';
import { formatMoney, formatDate, formatDateTime, formatHours, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { StaffModal } from './StaffModal';
import { PayrollModal, ADJ_LABELS } from './PayrollModal';
import { exportPayslips } from './payslip';

type Tab = 'team' | 'time' | 'payroll';

export default function StaffManagement() {
  const currentUser = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const { data: staff = [] } = useQuery({ queryKey: ['staff'], queryFn: getStaff });
  const { data: clockStatus = [] } = useQuery({ queryKey: ['clock-status'], queryFn: getClockStatus });
  const { data: timeLogs = [] } = useQuery({ queryKey: ['time-logs'], queryFn: () => getTimeLogs(120) });
  const { data: periods = [] } = useQuery({ queryKey: ['payroll'], queryFn: getPayrollPeriods });

  const [tab, setTab] = useState<Tab>('team');
  const [editStaff, setEditStaff] = useState<StaffRow | null | 'new'>(null);
  const [editPeriod, setEditPeriod] = useState<PayrollPeriod | null | 'new'>(null);

  const clockedInCount = clockStatus.filter((c) => c.open_log_id).length;

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => deleteTimeLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-logs'] });
      queryClient.invalidateQueries({ queryKey: ['clock-status'] });
      toast.success('Time log removed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => markPeriodPaid(id, currentUser?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('Payroll marked as paid');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: string) => deletePeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success('Draft deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const openShifts = useMemo(() => new Set(clockStatus.filter((c) => c.open_log_id).map((c) => c.id)), [clockStatus]);

  return (
    <PageShell
      title="Staff Management"
      subtitle="Team members, roles, permissions, time logs, and payroll."
      action={
        <button
          onClick={() => (tab === 'payroll' ? setEditPeriod('new') : setEditStaff('new'))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caramel text-paper text-[12.5px] font-semibold hover:bg-caramel-dark transition-colors shadow-[0_2px_8px_rgba(164,124,88,0.3)]"
        >
          <Plus size={15} /> {tab === 'payroll' ? 'Run Payroll' : 'Add Staff'}
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Team Members" value={String(staff.length)} icon={<Users size={16} />} />
        <MetricCard label="Clocked In Now" value={String(clockedInCount)} tone={clockedInCount > 0 ? 'success' : 'default'} />
        <MetricCard label="Payroll Periods" value={String(periods.length)} icon={<Wallet size={16} />} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-full bg-cream border border-line w-fit">
        {([['team', 'Team', Users], ['time', 'Time Logs', Clock], ['payroll', 'Payroll', Wallet]] as const).map(
          ([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 h-8 px-4 rounded-full text-[12px] font-semibold transition-all',
                tab === id ? 'bg-dark-roast text-paper shadow-sm' : 'text-muted hover:text-espresso'
              )}
            >
              <Icon size={13} /> {label}
            </button>
          )
        )}
      </div>

      {/* ── Team ── */}
      {tab === 'team' && (
        <SectionPanel noPad>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <Th>Name</Th><Th>Role</Th><Th>Username</Th><Th>Permissions</Th>
                  <Th align="right">Pay Rate</Th><Th align="center">Status</Th><Th align="right">Edit</Th>
                </tr>
              </thead>
              <tbody>
                {staff.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-caramel to-espresso grid place-items-center text-paper text-[11px] font-bold">
                          {p.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="text-[13px] font-semibold text-dark-roast">{p.full_name}</span>
                        {p.id === currentUser?.id && (
                          <span className="text-[10px] font-semibold text-caramel">you</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full border text-[10.5px] font-bold capitalize',
                        p.cafe_role === 'manager' ? 'bg-caramel-soft text-espresso border-caramel/30' : 'bg-cream text-muted border-line'
                      )}>
                        {p.cafe_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted">{p.username ?? '—'}</td>
                    <td className="px-4 py-3 text-[11.5px] text-muted">
                      {p.cafe_role === 'manager'
                        ? 'Full access'
                        : [p.can_view_inventory && 'Inventory', p.can_add_expenses && 'Expenses']
                            .filter(Boolean).join(', ') || 'POS only'}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-right whitespace-nowrap text-dark-roast">
                      {p.daily_rate != null ? `${formatMoney(p.daily_rate)}/day`
                        : p.hourly_rate != null ? `${formatMoney(p.hourly_rate)}/hr`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {openShifts.has(p.id) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage">
                          <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" /> In
                        </span>
                      ) : (
                        <span className="text-[11px] text-taupe">Out</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setEditStaff(p)}
                        title="Edit" aria-label="Edit"
                        className="w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-espresso hover:bg-cream border border-transparent hover:border-line transition-colors ml-auto"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      )}

      {/* ── Time Logs ── */}
      {tab === 'time' && (
        <SectionPanel noPad badge={`${timeLogs.length} entries`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <Th>Staff</Th><Th>Clock In</Th><Th>Clock Out</Th>
                  <Th align="right">Hours</Th><Th>Note</Th><Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center">
                    <Clock size={30} className="mx-auto text-taupe/40" />
                    <p className="text-muted text-sm mt-3">No shifts recorded yet.</p>
                  </td></tr>
                ) : (
                  timeLogs.map((log) => (
                    <tr key={log.id} className="border-b border-line/60 last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-3 text-[13px] font-semibold text-dark-roast">{log.staff_name}</td>
                      <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap">{formatDateTime(log.clock_in)}</td>
                      <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap">
                        {log.clock_out ? formatTime(log.clock_out) : (
                          <span className="inline-flex items-center gap-1 text-sage font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-right font-semibold text-espresso">
                        {log.hours_worked != null ? formatHours(log.hours_worked) : '—'}
                        {log.adjusted_by && <span className="text-[10px] text-amber ml-1">edited</span>}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-muted max-w-[200px] truncate">{log.adjustment_note ?? '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete this time log for ${log.staff_name}?`)) deleteLogMutation.mutate(log.id);
                          }}
                          title="Delete" aria-label="Delete"
                          className="w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-danger hover:bg-danger-soft border border-transparent hover:border-line transition-colors ml-auto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      )}

      {/* ── Payroll ── */}
      {tab === 'payroll' && (
        <div className="space-y-4">
          {periods.length === 0 ? (
            <SectionPanel noPad>
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Wallet size={32} className="text-taupe/40" />
                <p className="text-espresso font-semibold">No payroll periods yet</p>
                <p className="text-muted text-[12.5px] text-center max-w-sm">
                  Run payroll to compute pay from clocked hours, add bonuses or deductions, then mark it paid.
                </p>
                <button
                  onClick={() => setEditPeriod('new')}
                  className="mt-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caramel text-paper text-[12.5px] font-semibold hover:bg-caramel-dark transition-colors"
                >
                  <Plus size={15} /> Run Payroll
                </button>
              </div>
            </SectionPanel>
          ) : (
            periods.map((period) => {
              const total = period.entries?.reduce((s, e) => s + e.base_pay + sumAdjustments(e.adjustments), 0) ?? 0;
              return (
                <SectionPanel key={period.id} noPad>
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[14px] font-semibold text-espresso">
                          {formatDate(period.period_start)} – {formatDate(period.period_end)}
                        </h3>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase',
                          period.status === 'paid' ? 'bg-sage-soft text-sage border-sage/25' : 'bg-amber-soft text-amber border-amber/25'
                        )}>
                          {period.status}
                        </span>
                      </div>
                      {period.status === 'paid' && period.paid_at && (
                        <p className="text-[11px] text-muted mt-0.5">Paid {formatDateTime(period.paid_at)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-[17px] font-semibold text-espresso">{formatMoney(total)}</span>
                      <button
                        onClick={() => exportPayslips(period)}
                        title="Export payslips PDF" aria-label="Export payslips"
                        className="w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-espresso hover:bg-cream border border-transparent hover:border-line transition-colors"
                      >
                        <FileDown size={15} />
                      </button>
                      {period.status === 'draft' && (
                        <>
                          <button
                            onClick={() => setEditPeriod(period)}
                            title="Edit" aria-label="Edit"
                            className="w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-espresso hover:bg-cream border border-transparent hover:border-line transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this draft payroll period?')) deletePeriodMutation.mutate(period.id);
                            }}
                            title="Delete" aria-label="Delete"
                            className="w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-danger hover:bg-danger-soft border border-transparent hover:border-line transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Mark this payroll as paid? Total ${formatMoney(total)}. This locks the period.`)) {
                                markPaidMutation.mutate(period.id);
                              }
                            }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sage text-paper text-[11.5px] font-semibold hover:brightness-95 transition-all"
                          >
                            <CheckCircle2 size={14} /> Mark Paid
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-line/60">
                    {(period.entries ?? []).map((entry) => {
                      const entryTotal = entry.base_pay + sumAdjustments(entry.adjustments);
                      return (
                        <div key={entry.id} className="px-5 py-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[13px] font-semibold text-dark-roast">{entry.profile?.full_name}</p>
                            <p className="text-[11.5px] text-muted mt-0.5">
                              {entry.days_worked}d · {formatHours(entry.hours_worked)} · base {formatMoney(entry.base_pay)}
                            </p>
                            {entry.adjustments.map((adj, i) => (
                              <p key={i} className={cn('text-[11px] mt-0.5', adj.type === 'bonus' ? 'text-sage' : 'text-danger')}>
                                {adj.type === 'bonus' ? '+' : '−'}{formatMoney(adj.amount)} · {ADJ_LABELS[adj.type]}
                                {adj.note && <span className="text-muted"> ({adj.note})</span>}
                              </p>
                            ))}
                          </div>
                          <p className="font-heading text-[15px] font-semibold text-espresso whitespace-nowrap">{formatMoney(entryTotal)}</p>
                        </div>
                      );
                    })}
                  </div>
                </SectionPanel>
              );
            })
          )}
        </div>
      )}

      {editStaff !== null && (
        <StaffModal staff={editStaff === 'new' ? null : editStaff} onClose={() => setEditStaff(null)} />
      )}
      {editPeriod !== null && (
        <PayrollModal period={editPeriod === 'new' ? null : editPeriod} onClose={() => setEditPeriod(null)} />
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
