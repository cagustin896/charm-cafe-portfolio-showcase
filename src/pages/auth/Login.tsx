import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Coffee } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { LogoMark } from '@/components/ui/Logo';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profile = await signIn(email, password);
      if (useAuthStore.getState().mustChangeCredentials) {
        navigate('/setup-account', { replace: true });
        return;
      }
      toast.success(`Welcome back, ${profile.full_name.split(' ')[0]}!`);
      navigate(profile.cafe_role === 'manager' ? '/dashboard' : '/staff-dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message.includes('Invalid') ? 'Incorrect email or password' : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background texture rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full border border-sand/40" />
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full border border-sand/30" />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full border border-sand/40" />
        <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full border border-sand/30" />

        {/* Coffee ring stain decorations */}
        <div className="absolute top-[18%] left-[8%] w-24 h-24 rounded-full border-[3px] border-sand/25 opacity-60" />
        <div className="absolute top-[20%] left-[10%] w-16 h-16 rounded-full border-2 border-sand/20 opacity-50" />
        <div className="absolute bottom-[22%] right-[7%] w-20 h-20 rounded-full border-[3px] border-sand/20 opacity-50" />
      </div>

      {/* Header brand */}
      <div className="relative mb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-dark-roast mb-5 shadow-lg shadow-dark-roast/20">
          <LogoMark size={28} className="text-caramel" />
        </div>
        <h1 className="font-heading text-4xl font-semibold text-dark-roast tracking-tight">
          Charm Cafe
        </h1>
        <p className="font-script text-2xl text-caramel mt-1 leading-relaxed">
          A little charm in every cup
        </p>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-[400px]">
        <div className="bg-paper rounded-2xl border border-line shadow-[0_8px_40px_rgba(44,24,16,0.10)] p-8">

          <div className="mb-7">
            <h2 className="font-heading text-[22px] font-semibold text-espresso">Welcome back</h2>
            <p className="text-muted text-sm mt-1">Sign in to manage your cafe.</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder="you@charmcafe.ph"
                className={cn(
                  'w-full h-11 px-4 rounded-lg border bg-cream/60 text-dark-roast text-sm placeholder:text-faint',
                  'outline-none transition-all',
                  'border-line focus:border-caramel focus:shadow-[0_0_0_3px_rgba(164,124,88,0.12)]'
                )}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full h-11 px-4 pr-11 rounded-lg border bg-cream/60 text-dark-roast text-sm placeholder:text-faint',
                    'outline-none transition-all',
                    'border-line focus:border-caramel focus:shadow-[0_0_0_3px_rgba(164,124,88,0.12)]'
                  )}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={cn(
                'w-full h-11 rounded-lg font-semibold text-[14px] transition-all mt-2',
                'bg-caramel text-paper hover:bg-caramel-dark',
                'shadow-[0_2px_8px_rgba(164,124,88,0.3)] hover:shadow-[0_4px_16px_rgba(164,124,88,0.4)]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                loading && 'cursor-not-allowed'
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footnote */}
        <p className="text-center text-[11.5px] text-muted mt-5">
          First time?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast.info('Manager: manager@charmcafe.ph / charm2026 · Staff: staff@charmcafe.ph / staff2026', {
                duration: 8000,
              });
            }}
            className="text-caramel hover:text-espresso underline underline-offset-2 transition-colors"
          >
            Show demo accounts
          </a>
        </p>
      </div>

      {/* Bottom brand strip */}
      <div className="relative mt-auto pt-12 flex items-center gap-2 text-[11px] text-taupe/60">
        <Coffee size={12} />
        <span>Charm Cafe Management System · Cebu, Philippines</span>
      </div>
    </div>
  );
}
