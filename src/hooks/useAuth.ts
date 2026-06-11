import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as authService from '@/services/authService';
import { seedIfNeeded } from '@/data/seed';
import type { Profile } from '@/types';

export function useAuth() {
  const { profile, isLoading, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    seedIfNeeded();
    setProfile(authService.getCurrentProfile());
    setLoading(false);
  }, [setProfile, setLoading]);

  async function signIn(email: string, password: string): Promise<Profile> {
    const signedInProfile = authService.signIn(email, password);
    setProfile(signedInProfile);
    return signedInProfile;
  }

  async function signOut() {
    authService.signOut();
    useAuthStore.getState().signOut();
  }

  return {
    profile,
    isLoading,
    isAuthenticated: !!profile,
    isManager: profile?.cafe_role === 'manager',
    signIn,
    signOut,
  };
}
