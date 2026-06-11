// ─── Local Auth Service ───────────────────────────────────────────────────────
// Email/password accounts stored locally for single-device use. When Supabase
// is reactivated, this module's API stays the same and the implementation
// switches to supabase.auth.

import type { Profile } from '@/types';
import {
  readCollection, writeCollection, readSession, writeSession, clearSession, nowIso,
} from '@/services/storage';

/**
 * Demo mode (the public portfolio showcase) skips the forced credential
 * setup so visitors can explore with the documented demo accounts.
 * Set VITE_DEMO_MODE=true on the showcase deployment only.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export interface LocalAccount {
  profile_id: string;
  username: string;
  password: string;
  /** Seeded/temporary credentials — owner must set their own on first sign-in. */
  must_change_credentials?: boolean;
  /** Legacy field from the email-login era; migrated to username on bootstrap. */
  email?: string;
}

/** Username of an account, tolerating legacy email-era records. */
export function accountUsername(account: LocalAccount): string {
  return (account.username ?? account.email ?? '').trim();
}

/**
 * Factory credentials baked into the seed. These are public (README + the
 * "Show demo accounts" hint), so any account still on one of these MUST set
 * its own credentials before entering the app — even on browsers that were
 * seeded before the forced-setup feature existed.
 */
export const SEEDED_DEFAULT_CREDENTIALS = [
  { profile_id: 'profile-manager', username: 'manager', password: 'charm2026' },
  { profile_id: 'profile-staff-1', username: 'staff', password: 'staff2026' },
] as const;

function matchesFactoryDefault(account: LocalAccount): boolean {
  return SEEDED_DEFAULT_CREDENTIALS.some(
    (d) =>
      d.profile_id === account.profile_id &&
      d.username.toLowerCase() === accountUsername(account).toLowerCase() &&
      d.password === account.password
  );
}

/** Validate a username: 3-20 chars, letters/numbers/dot/underscore/hyphen, no spaces. */
function validateUsername(username: string): string {
  const u = username.trim();
  if (u.length < 3) throw new Error('Username must be at least 3 characters');
  if (u.length > 20) throw new Error('Username must be 20 characters or fewer');
  if (!/^[A-Za-z0-9._-]+$/.test(u)) {
    throw new Error('Username can use letters, numbers, dot, underscore, hyphen — no spaces');
  }
  return u;
}

/**
 * One-time migration: copy legacy `email` records to `username`. Idempotent,
 * runs on bootstrap so browsers seeded during the email-login era keep working.
 */
export function migrateAccounts(): void {
  const accounts = readCollection<LocalAccount>('accounts');
  let changed = false;
  const migrated = accounts.map((a) => {
    if (a.username == null && a.email != null) {
      changed = true;
      const { email, ...rest } = a;
      return { ...rest, username: email };
    }
    return a;
  });
  if (changed) writeCollection('accounts', migrated);
}

export function getCurrentProfile(): Profile | null {
  const profileId = readSession();
  if (!profileId) return null;
  const profiles = readCollection<Profile>('profiles');
  return profiles.find((p) => p.id === profileId && p.is_active) ?? null;
}

export function signIn(username: string, password: string): Profile {
  const accounts = readCollection<LocalAccount>('accounts');
  const account = accounts.find(
    (a) => accountUsername(a).toLowerCase() === username.trim().toLowerCase()
  );
  if (!account || account.password !== password) {
    throw new Error('Incorrect username or password');
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

export function getAccountUsername(profileId: string): string | null {
  const account = readCollection<LocalAccount>('accounts').find((a) => a.profile_id === profileId);
  return account ? accountUsername(account) : null;
}

/** Does this profile's account still carry seeded/temporary credentials? */
export function accountMustChange(profileId: string): boolean {
  if (DEMO_MODE) return false;
  const account = readCollection<LocalAccount>('accounts').find((a) => a.profile_id === profileId);
  if (!account) return false;
  // Explicit flag (fresh seed + manager-issued temp passwords) OR still on a
  // factory default (catches browsers seeded before this feature shipped).
  return account.must_change_credentials === true || matchesFactoryDefault(account);
}

/**
 * First-login account setup: the owner sets their own name and replaces the
 * temporary email/password with their own. No current-password check — they
 * just authenticated with the temporary credentials.
 */
export function completeCredentialSetup(
  profileId: string,
  fullName: string,
  newUsername: string,
  newPassword: string
): void {
  const name = fullName.trim();
  if (!name) throw new Error('Enter your name');
  const username = validateUsername(newUsername);
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const accounts = readCollection<LocalAccount>('accounts');
  const account = accounts.find((a) => a.profile_id === profileId);
  if (!account) throw new Error('Account not found');
  if (newPassword === account.password) {
    throw new Error('Choose a different password than the temporary one');
  }
  if (accounts.some((a) => a.profile_id !== profileId && accountUsername(a).toLowerCase() === username.toLowerCase())) {
    throw new Error('That username is already taken');
  }

  writeCollection(
    'accounts',
    accounts.map((a) =>
      a.profile_id === profileId
        ? { profile_id: a.profile_id, username, password: newPassword, must_change_credentials: false }
        : a
    )
  );

  // Update the owner's display name on their profile
  const profiles = readCollection<Profile>('profiles');
  writeCollection(
    'profiles',
    profiles.map((p) => (p.id === profileId ? { ...p, full_name: name, updated_at: nowIso() } : p))
  );
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
