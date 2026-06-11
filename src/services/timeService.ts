// ─── Time Clock Service ───────────────────────────────────────────────────────
// Clock in/out with optional PIN. hours_worked is computed on clock-out,
// mirroring the compute_hours_worked trigger.

import type { TimeLog, Profile } from '@/types';
import { readCollection, writeCollection, uid, nowIso } from '@/services/storage';

export interface ClockableStaff {
  id: string;
  full_name: string;
  cafe_role: 'manager' | 'staff';
  has_pin: boolean;
  open_log_id: string | null; // currently clocked in?
  clocked_in_at: string | null;
}

export async function getClockStatus(): Promise<ClockableStaff[]> {
  const profiles = readCollection<Profile>('profiles').filter((p) => p.is_active);
  const logs = readCollection<TimeLog>('time_logs');
  const openByProfile = new Map<string, TimeLog>();
  for (const log of logs) {
    if (!log.clock_out) openByProfile.set(log.profile_id, log);
  }

  return profiles
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map((p) => {
      const open = openByProfile.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        cafe_role: p.cafe_role,
        has_pin: !!p.pin_code,
        open_log_id: open?.id ?? null,
        clocked_in_at: open?.clock_in ?? null,
      };
    });
}

function verifyPin(profileId: string, pin: string | null): void {
  const profile = readCollection<Profile>('profiles').find((p) => p.id === profileId);
  if (!profile) throw new Error('Staff member not found');
  if (profile.pin_code) {
    if (pin !== profile.pin_code) throw new Error('Incorrect PIN');
  }
}

export function clockIn(profileId: string, pin: string | null): void {
  verifyPin(profileId, pin);

  const logs = readCollection<TimeLog>('time_logs');
  if (logs.some((l) => l.profile_id === profileId && !l.clock_out)) {
    throw new Error('Already clocked in');
  }

  logs.push({
    id: uid(),
    profile_id: profileId,
    clock_in: nowIso(),
    clock_out: null,
    hours_worked: null,
    adjustment_note: null,
    adjusted_by: null,
    created_at: nowIso(),
  });
  writeCollection('time_logs', logs);
}

export function clockOut(profileId: string, pin: string | null): number {
  verifyPin(profileId, pin);

  const logs = readCollection<TimeLog>('time_logs');
  const open = logs.find((l) => l.profile_id === profileId && !l.clock_out);
  if (!open) throw new Error('Not clocked in');

  const now = nowIso();
  const hours = Math.round(((new Date(now).getTime() - new Date(open.clock_in).getTime()) / 3600000) * 100) / 100;

  writeCollection(
    'time_logs',
    logs.map((l) => (l.id === open.id ? { ...l, clock_out: now, hours_worked: hours } : l))
  );
  return hours;
}

// ─── Time log history (manager view) ─────────────────────────────────────────

export interface TimeLogRow extends TimeLog {
  staff_name: string;
}

export async function getTimeLogs(limit = 100): Promise<TimeLogRow[]> {
  const logs = readCollection<TimeLog>('time_logs');
  const profiles = readCollection<Profile>('profiles');
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

  return logs
    .sort((a, b) => b.clock_in.localeCompare(a.clock_in))
    .slice(0, limit)
    .map((l) => ({ ...l, staff_name: nameById.get(l.profile_id) ?? 'Unknown' }));
}

/** Manager manual edit of a completed shift's hours. */
export function adjustTimeLog(logId: string, hours: number, note: string, adjustedBy: string): void {
  if (!(hours >= 0)) throw new Error('Hours cannot be negative');
  const logs = readCollection<TimeLog>('time_logs');
  const log = logs.find((l) => l.id === logId);
  if (!log) throw new Error('Time log not found');
  if (!log.clock_out) throw new Error('Cannot adjust an open shift');

  writeCollection(
    'time_logs',
    logs.map((l) =>
      l.id === logId
        ? { ...l, hours_worked: hours, adjustment_note: note.trim() || null, adjusted_by: adjustedBy }
        : l
    )
  );
}

export function deleteTimeLog(logId: string): void {
  const logs = readCollection<TimeLog>('time_logs');
  if (!logs.some((l) => l.id === logId)) throw new Error('Time log not found');
  writeCollection('time_logs', logs.filter((l) => l.id !== logId));
}
