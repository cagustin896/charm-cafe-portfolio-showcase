// ─── Payroll Service ──────────────────────────────────────────────────────────
// Computes a payroll period from completed time logs, lets a manager add
// adjustments (bonus / deduction / cash advance), and marks the period paid.

import type {
  PayrollPeriod, PayrollEntry, PayrollAdjustment, TimeLog, Profile,
} from '@/types';
import { readCollection, writeCollection, uid, nowIso } from '@/services/storage';
import { manilaDateKey } from '@/utils/format';

export function sumAdjustments(adjustments: PayrollAdjustment[]): number {
  return adjustments.reduce(
    (sum, a) => sum + (a.type === 'bonus' ? a.amount : -a.amount),
    0
  );
}

/** Build (but don't save) the entries for a period from time logs + pay rates. */
export function computePeriod(periodStart: string, periodEnd: string): PayrollEntry[] {
  if (periodStart > periodEnd) throw new Error('Start date must be before end date');

  const profiles = readCollection<Profile>('profiles').filter((p) => p.is_active);
  const logs = readCollection<TimeLog>('time_logs').filter((l) => {
    if (!l.clock_out) return false;
    const day = manilaDateKey(l.clock_in);
    return day >= periodStart && day <= periodEnd;
  });

  const entries: PayrollEntry[] = [];
  for (const profile of profiles) {
    const myLogs = logs.filter((l) => l.profile_id === profile.id);
    if (myLogs.length === 0 && profile.daily_rate == null && profile.hourly_rate == null) continue;

    const hours = myLogs.reduce((s, l) => s + (l.hours_worked ?? 0), 0);
    const days = new Set(myLogs.map((l) => manilaDateKey(l.clock_in))).size;

    let basePay = 0;
    if (profile.daily_rate != null) basePay = profile.daily_rate * days;
    else if (profile.hourly_rate != null) basePay = profile.hourly_rate * hours;

    entries.push({
      id: uid(),
      payroll_period_id: '',
      profile_id: profile.id,
      hours_worked: Math.round(hours * 100) / 100,
      days_worked: days,
      base_pay: Math.round(basePay * 100) / 100,
      adjustments: [],
      total_pay: Math.round(basePay * 100) / 100,
      notes: null,
      profile,
    });
  }
  return entries;
}

export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  return readCollection<PayrollPeriod>('payroll_periods')
    .sort((a, b) => b.period_start.localeCompare(a.period_start) || b.created_at.localeCompare(a.created_at));
}

export interface SavePeriodInput {
  id: string | null;
  periodStart: string;
  periodEnd: string;
  entries: PayrollEntry[];
}

export function savePeriod(input: SavePeriodInput): PayrollPeriod {
  const periods = readCollection<PayrollPeriod>('payroll_periods');

  const entries = input.entries.map((e) => ({
    ...e,
    total_pay: Math.round((e.base_pay + sumAdjustments(e.adjustments)) * 100) / 100,
  }));

  if (input.id) {
    const existing = periods.find((p) => p.id === input.id);
    if (!existing) throw new Error('Payroll period not found');
    if (existing.status === 'paid') throw new Error('A paid period cannot be edited');
    const updated: PayrollPeriod = {
      ...existing,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      entries: entries.map((e) => ({ ...e, payroll_period_id: existing.id })),
    };
    writeCollection('payroll_periods', periods.map((p) => (p.id === input.id ? updated : p)));
    return updated;
  }

  const periodId = uid();
  const period: PayrollPeriod = {
    id: periodId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    status: 'draft',
    paid_at: null,
    paid_by: null,
    created_at: nowIso(),
    entries: entries.map((e) => ({ ...e, payroll_period_id: periodId })),
  };
  writeCollection('payroll_periods', [...periods, period]);
  return period;
}

export function markPeriodPaid(periodId: string, paidBy: string): void {
  const periods = readCollection<PayrollPeriod>('payroll_periods');
  const period = periods.find((p) => p.id === periodId);
  if (!period) throw new Error('Payroll period not found');
  if (period.status === 'paid') throw new Error('Already marked paid');

  writeCollection(
    'payroll_periods',
    periods.map((p) =>
      p.id === periodId ? { ...p, status: 'paid', paid_at: nowIso(), paid_by: paidBy } : p
    )
  );
}

export function deletePeriod(periodId: string): void {
  const periods = readCollection<PayrollPeriod>('payroll_periods');
  const period = periods.find((p) => p.id === periodId);
  if (!period) throw new Error('Payroll period not found');
  if (period.status === 'paid') throw new Error('A paid period cannot be deleted');
  writeCollection('payroll_periods', periods.filter((p) => p.id !== periodId));
}
