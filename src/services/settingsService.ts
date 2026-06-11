// ─── Settings Service ─────────────────────────────────────────────────────────
// Cafe profile, receipt config, and order numbering. Single document.

import type { CafeSettings } from '@/types';
import { readSingleton, writeSingleton } from '@/services/storage';
import { DEFAULT_SETTINGS } from '@/data/seed';

export async function getSettings(): Promise<CafeSettings> {
  return readSingleton<CafeSettings>(DEFAULT_SETTINGS);
}

export function saveSettings(patch: Partial<CafeSettings>): CafeSettings {
  const current = readSingleton<CafeSettings>(DEFAULT_SETTINGS);
  const next: CafeSettings = { ...current, ...patch };

  if (!next.business_name.trim()) throw new Error('Business name is required');
  next.business_name = next.business_name.trim();
  next.or_prefix = (next.or_prefix || 'ORD').trim().toUpperCase().slice(0, 6);

  writeSingleton(next);
  return next;
}
