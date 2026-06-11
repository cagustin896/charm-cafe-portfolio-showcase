import { format, formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const MANILA_TZ = 'Asia/Manila';
const PHP_LOCALE = 'en-PH';

// ─── Currency ────────────────────────────────────────────────────────────────

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat(PHP_LOCALE, {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyShort(amount: number): string {
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(1)}K`;
  return formatMoney(amount);
}

// ─── Dates (all Manila time) ──────────────────────────────────────────────────

export function toManila(date: string | Date): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(d, MANILA_TZ);
}

export function formatDate(date: string | Date, pattern = 'MMM d, yyyy'): string {
  return format(toManila(date), pattern);
}

export function formatDateTime(date: string | Date): string {
  return format(toManila(date), 'MMM d, yyyy h:mm a');
}

export function formatTime(date: string | Date): string {
  return format(toManila(date), 'h:mm a');
}

export function formatDateShort(date: string | Date): string {
  return format(toManila(date), 'MMM d');
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function todayInManila(): Date {
  return toZonedTime(new Date(), MANILA_TZ);
}

export function todayLabel(): string {
  return format(todayInManila(), 'EEEE, MMMM d, yyyy');
}

/** Stable yyyy-MM-dd key in Manila time — for grouping shifts/sales by business day. */
export function manilaDateKey(date: string | Date): string {
  return format(toManila(date), 'yyyy-MM-dd');
}

export function todayKey(): string {
  return format(todayInManila(), 'yyyy-MM-dd');
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat(PHP_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatOrderNo(no: string | number): string {
  const n = typeof no === 'number' ? no : parseInt(no.replace(/\D/g, ''), 10);
  return `ORD-${String(n).padStart(4, '0')}`;
}
