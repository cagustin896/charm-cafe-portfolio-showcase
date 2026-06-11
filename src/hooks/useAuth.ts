import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as authService from '@/services/authService';
import { seedIfNeeded } from '@/data/seed';
import type { Profile } from '@/types';

export function useAuth() {
  const {
    profile, isLoading, mustChangeCredentials,
    setProfile, setLoading, setMustChangeCredentials,
  } = useAuthStore();

  useEffect(() => {
    seedIfNeeded();
    authService.migrateAccounts();
    const current = authService.getCurrentProfile();
    setProfile(current);
    setMustChangeCredentials(current ? authService.accountMustChange(current.id) : false);
    setLoading(false);
  }, [setProfile, setLoading, setMustChangeCredentials]);

  async function signIn(email: string, password: string): Promise<Profile> {
    const signedInProfile = authService.signIn(email, password);
    setProfile(signedInProfile);
    setMustChangeCredentials(authService.accountMustChange(signedInProfile.id));
    return signedInProfile;
  }

  async function signOut() {
    authService.signOut();
    useAuthStore.getState().signOut();
  }

  return {
    profile,
    isLoading,
    mustChangeCredentials,
    isAuthenticated: !!profile,
    isManager: profile?.cafe_role === 'manager',
    signIn,
    signOut,
  };
}
