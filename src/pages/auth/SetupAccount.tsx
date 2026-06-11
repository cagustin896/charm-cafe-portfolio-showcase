import { useState, FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { completeCredentialSetup, getAccountUsername, getCurrentProfile } from '@/services/authService';
import { BrandLogo } from '@/components/ui/Logo';
import { cn } from '@/utils/cn';

/**
 * First-login credential setup. Reached when the session was opened with
 * temporary credentials (seeded demo accounts, or a password the manager
 * handed out). The owner sets their own email + password before entering.
 */
export default function SetupAccount() {
  const { profile, isLoading, mustChangeCredentials, signOut } = useAuth();
  const setMustChangeCredentials = useAuthStore((s) => s.setMustChangeCredentials);
  const setProfile = useAuthStore((s) => s.setProfile);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  // Controlled-with-default: show the current account username until the user types
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  if (!mustChangeCredentials) {
    return <Navigate to={profile.cafe_role === 'manager' ? '/dashboard' : '/staff-dashboard'} replace />;
  }

  const usernameValue = usernameDraft !== null ? usernameDraft : (getAccountUsername(profile.id) ?? '');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError('');
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      completeCredentialSetup(profile.id, fullName, usernameValue, password);
      // Refresh the store so the new name shows in the greeting, sidebar, etc.
      setProfile(getCurrentProfile());
      setMustChangeCredentials(false);
      toast.success('Account secured — welcome aboard!');
      navigate(profile.cafe_role === 'manager' ? '/dashboard' : '/staff-dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const fieldClass = cn(
    'w-full h-11 px-4 rounded-lg border bg-cream/60 text-dark-roast text-sm placeholder:text-faint',
    'outline-none transition-all',
    'border-line focus:border-caramel focus:shadow-[0_0_0_3px_rgba(164,124,88,0.12)]'
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background rings (same family as the login page) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full border border-sand/40" />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full border border-sand/40" />
      </div>

      <div className="relative mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-paper border border-line mb-5 shadow-[0_8px_24px_rgba(44,24,16,0.12)] overflow-hidden">
          <BrandLogo size={68} />
        </div>
        <h1 className="font-heading text-3xl font-semibold text-dark-roast tracking-tight">
          Welcome to Charm Cafe!
        </h1>
        <p className="text-muted text-[13px] mt-2 max-w-[340px]">
          You signed in with a temporary password. Set up your account with your own
          name and credentials to secure it.
        </p>
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="bg-paper rounded-2xl border border-line shadow-[0_8px_40px_rgba(44,24,16,0.10)] p-8">

          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={18} className="text-sage" />
            <h2 className="font-heading text-[18px] font-semibold text-espresso">Secure your account</h2>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wide">
                Your name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Juan dela Cruz"
                autoComplete="name"
                className={fieldClass}
              />
              <p className="text-[10.5px] text-faint">Shown across the app — use your real name.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wide">
                Your username
              </label>
              <input
                type="text"
                value={usernameValue}
                onChange={(e) => setUsernameDraft(e.target.value)}
                required
                placeholder="e.g. andrea"
                autoComplete="username"
                className={fieldClass}
              />
              <p className="text-[10.5px] text-faint">You'll use this to sign in from now on.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wide">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  className={cn(fieldClass, 'pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe hover:text-espresso transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wide">
                Confirm password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat the new password"
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !fullName.trim() || !password || !confirm}
              className={cn(
                'w-full h-11 rounded-lg font-semibold text-[14px] transition-all mt-2',
                'bg-caramel text-paper hover:bg-caramel-dark',
                'shadow-[0_2px_8px_rgba(164,124,88,0.3)] hover:shadow-[0_4px_16px_rgba(164,124,88,0.4)]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
              )}
            >
              {saving ? 'Securing…' : 'Save & Continue'}
            </button>
          </form>
        </div>

        <button
          onClick={handleSignOut}
          className="mx-auto mt-5 flex items-center gap-1.5 text-[11.5px] text-muted hover:text-espresso underline underline-offset-2 transition-colors"
        >
          <LogOut size={12} /> Sign out instead
        </button>
      </div>
    </div>
  );
}
