import { create } from 'zustand';
import type { Profile } from '@/types';

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  /** Signed in with temporary credentials — must complete first-login setup. */
  mustChangeCredentials: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setMustChangeCredentials: (must: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isLoading: true,
  mustChangeCredentials: false,

  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setMustChangeCredentials: (mustChangeCredentials) => set({ mustChangeCredentials }),

  signOut: () => set({ profile: null, mustChangeCredentials: false }),
}));

// Convenience selectors
export const selectIsManager = (state: AuthState): boolean =>
  state.profile?.cafe_role === 'manager';

export const selectCanViewInventory = (state: AuthState): boolean =>
  state.profile?.cafe_role === 'manager' || (state.profile?.can_view_inventory ?? false);

export const selectCanAddExpenses = (state: AuthState): boolean =>
  state.profile?.cafe_role === 'manager' || (state.profile?.can_add_expenses ?? false);
