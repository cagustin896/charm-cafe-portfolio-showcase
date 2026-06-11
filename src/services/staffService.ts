// ─── Staff Service ────────────────────────────────────────────────────────────
// Team CRUD: profiles + their local login accounts + permission flags + pay
// rates + clock-in PIN. Mirrors profiles table; when Supabase returns, account
// creation moves to supabase.auth.admin.

import type { Profile } from '@/types';
import type { LocalAccount } from '@/services/authService';
import { readCollection, writeCollection, uid, nowIso } from '@/services/storage';

export interface StaffRow extends Profile {
  email: string | null;
}

export async function getStaff(): Promise<StaffRow[]> {
  const profiles = readCollection<Profile>('profiles');
  const accounts = readCollection<LocalAccount>('accounts');
  const emailByProfile = new Map(accounts.map((a) => [a.profile_id, a.email]));

  return profiles
    .filter((p) => p.is_active)
    .sort((a, b) => {
      if (a.cafe_role !== b.cafe_role) return a.cafe_role === 'manager' ? -1 : 1;
      return a.full_name.localeCompare(b.full_name);
    })
    .map((p) => ({ ...p, email: emailByProfile.get(p.id) ?? null }));
}

export interface StaffInput {
  fullName: string;
  email: string;
  password: string | null; // required on create; optional on edit (blank = unchanged)
  cafeRole: 'manager' | 'staff';
  canViewInventory: boolean;
  canAddExpenses: boolean;
  payType: 'daily' | 'hourly';
  rate: number;
  pinCode: string | null;
}

function validatePin(pin: string | null): void {
  if (pin && !/^\d{4,6}$/.test(pin)) throw new Error('PIN must be 4–6 digits');
}

export function createStaff(input: StaffInput): Profile {
  const name = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) throw new Error('Full name is required');
  if (!email) throw new Error('Email is required');
  if (!input.password || input.password.length < 6) throw new Error('Password must be at least 6 characters');
  validatePin(input.pinCode);

  const accounts = readCollection<LocalAccount>('accounts');
  if (accounts.some((a) => a.email.toLowerCase() === email)) {
    throw new Error('That email is already in use');
  }

  const now = nowIso();
  const profile: Profile = {
    id: uid(),
    full_name: name,
    cafe_role: input.cafeRole,
    can_view_inventory: input.cafeRole === 'manager' ? true : input.canViewInventory,
    can_add_expenses: input.cafeRole === 'manager' ? true : input.canAddExpenses,
    is_active: true,
    daily_rate: input.payType === 'daily' ? input.rate : null,
    hourly_rate: input.payType === 'hourly' ? input.rate : null,
    pin_code: input.pinCode,
    created_at: now,
    updated_at: now,
  };

  const profiles = readCollection<Profile>('profiles');
  writeCollection('profiles', [...profiles, profile]);
  writeCollection('accounts', [
    ...accounts,
    // Manager hands out a temporary password — the staff member sets their own on first sign-in
    { profile_id: profile.id, email, password: input.password, must_change_credentials: true },
  ]);
  return profile;
}

export function updateStaff(profileId: string, input: StaffInput, currentUserId?: string): Profile {
  const name = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) throw new Error('Full name is required');
  if (!email) throw new Error('Email is required');
  validatePin(input.pinCode);

  const profiles = readCollection<Profile>('profiles');
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error('Staff member not found');

  const accounts = readCollection<LocalAccount>('accounts');
  if (accounts.some((a) => a.profile_id !== profileId && a.email.toLowerCase() === email)) {
    throw new Error('That email is already in use');
  }

  const updated: Profile = {
    ...profile,
    full_name: name,
    cafe_role: input.cafeRole,
    can_view_inventory: input.cafeRole === 'manager' ? true : input.canViewInventory,
    can_add_expenses: input.cafeRole === 'manager' ? true : input.canAddExpenses,
    daily_rate: input.payType === 'daily' ? input.rate : null,
    hourly_rate: input.payType === 'hourly' ? input.rate : null,
    pin_code: input.pinCode,
    updated_at: nowIso(),
  };
  writeCollection('profiles', profiles.map((p) => (p.id === profileId ? updated : p)));

  // Update / create the login account. When a manager resets someone else's
  // password it's a temporary one — flag the owner to set their own next login.
  const passwordReset = !!input.password && input.password.length >= 6;
  const resetByOther = passwordReset && currentUserId !== undefined && profileId !== currentUserId;
  const existingAccount = accounts.find((a) => a.profile_id === profileId);
  const nextAccounts = existingAccount
    ? accounts.map((a) =>
        a.profile_id === profileId
          ? {
              ...a,
              email,
              password: passwordReset ? input.password! : a.password,
              must_change_credentials: resetByOther ? true : a.must_change_credentials,
            }
          : a
      )
    : [...accounts, { profile_id: profileId, email, password: input.password || 'changeme', must_change_credentials: true }];
  writeCollection('accounts', nextAccounts);

  return updated;
}

export function deactivateStaff(profileId: string, currentUserId: string): void {
  if (profileId === currentUserId) throw new Error("You can't deactivate your own account");

  const profiles = readCollection<Profile>('profiles');
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error('Staff member not found');

  const activeManagers = profiles.filter((p) => p.is_active && p.cafe_role === 'manager');
  if (profile.cafe_role === 'manager' && activeManagers.length <= 1) {
    throw new Error('At least one active manager is required');
  }

  writeCollection(
    'profiles',
    profiles.map((p) => (p.id === profileId ? { ...p, is_active: false, updated_at: nowIso() } : p))
  );
}
