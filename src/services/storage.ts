// ─── Local Storage Engine ─────────────────────────────────────────────────────
// All app data lives in localStorage under namespaced keys. This module is the
// ONLY place that touches localStorage directly — services go through it, and
// the UI goes through services. Swapping this layer for Supabase later means
// reimplementing the services, not the pages.

const NS = 'charm-cafe:v1:';

export type CollectionName =
  | 'profiles'
  | 'accounts'
  | 'product_categories'
  | 'inventory_categories'
  | 'units'
  | 'inventory_items'
  | 'stock_movements'
  | 'products'
  | 'add_ons'
  | 'orders'
  | 'purchases'
  | 'expenses'
  | 'assets'
  | 'time_logs'
  | 'payroll_periods';

const ALL_COLLECTIONS: CollectionName[] = [
  'profiles', 'accounts', 'product_categories', 'inventory_categories', 'units',
  'inventory_items', 'stock_movements', 'products', 'add_ons', 'orders',
  'purchases', 'expenses', 'assets', 'time_logs', 'payroll_periods',
];

const SETTINGS_KEY = `${NS}settings`;
const SESSION_KEY = `${NS}session`;
const SEEDED_KEY = `${NS}seeded`;

// ─── Core read/write ─────────────────────────────────────────────────────────

export function readCollection<T>(name: CollectionName): T[] {
  const raw = localStorage.getItem(NS + name);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    console.error(`[storage] Corrupt collection "${name}" — returning empty.`);
    return [];
  }
}

export function writeCollection<T>(name: CollectionName, rows: T[]): void {
  localStorage.setItem(NS + name, JSON.stringify(rows));
}

export function readSingleton<T>(fallback: T): T {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

export function writeSingleton<T>(value: T): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
}

// ─── Session ─────────────────────────────────────────────────────────────────

export function readSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function writeSession(profileId: string): void {
  localStorage.setItem(SESSION_KEY, profileId);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ─── Seeding ─────────────────────────────────────────────────────────────────

export function isSeeded(): boolean {
  return localStorage.getItem(SEEDED_KEY) === 'true';
}

export function markSeeded(): void {
  localStorage.setItem(SEEDED_KEY, 'true');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────

export interface BackupFile {
  app: 'charm-cafe';
  version: 1;
  exported_at: string;
  settings: unknown;
  collections: Record<string, unknown[]>;
}

export function exportAll(): BackupFile {
  const collections: Record<string, unknown[]> = {};
  for (const name of ALL_COLLECTIONS) {
    collections[name] = readCollection(name);
  }
  return {
    app: 'charm-cafe',
    version: 1,
    exported_at: nowIso(),
    settings: JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'),
    collections,
  };
}

export function importAll(backup: BackupFile): void {
  if (backup.app !== 'charm-cafe' || backup.version !== 1) {
    throw new Error('Not a valid Charm Cafe backup file.');
  }
  for (const name of ALL_COLLECTIONS) {
    if (backup.collections[name]) {
      writeCollection(name, backup.collections[name]);
    }
  }
  if (backup.settings != null) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
  }
  markSeeded();
}
