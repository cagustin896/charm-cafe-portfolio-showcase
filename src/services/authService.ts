// ─── Local Auth Service ───────────────────────────────────────────────────────
// Email/password accounts stored locally for single-device use. When Supabase
// is reactivated, this module's API stays the same and the implementation
// switches to supabase.auth.

import type { Profile } from '@/types';
import {
  readCollection, writeCollection, readSession, writeSession, clearSession,
} from '@/services/storage';

export interface LocalAccount {
  profile_id: string;
  email: string;
  password: string;
}

export function getCurrentProfile(): Profile | null {
  const profileId = readSession();
  if (!profileId) return null;
  const profiles = readCollection<Profile>('profiles');
  return profiles.find((p) => p.id === profileId && p.is_active) ?? null;
}

export function signIn(email: string, password: string): Profile {
  const accounts = readCollection<LocalAccount>('accounts');
  const account = accounts.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!account || account.password !== password) {
    throw new Error('Incorrect email or password');
  }

  const profiles = readCollection<Profile>('profiles');
  const profile = profiles.find((p) => p.id === account.profile_id);
  if (!profile) throw new Error('Account profile not found');
  if (!profile.is_active) throw new Error('This account has been deactivated');

  writeSession(profile.id);
  return profile;
}

export function signOut(): void {
  clearSession();
}

export function changePassword(profileId: string, currentPassword: string, newPassword: string): void {
  const accounts = readCollection<LocalAccount>('accounts');
  const account = accounts.find((a) => a.profile_id === profileId);
  if (!account) throw new Error('Account not found');
  if (account.password !== currentPassword) throw new Error('Current password is incorrect');
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

  writeCollection(
    'accounts',
    accounts.map((a) => (a.profile_id === profileId ? { ...a, password: newPassword } : a))
  );
}
