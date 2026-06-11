import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getSettings } from '@/services/settingsService';
import { todayLabel } from '@/utils/format';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/staff-dashboard': 'My Day',
  '/pos': 'Point of Sale',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/expenses': 'Expenses',
  '/analytics': 'Analytics',
  '/staff': 'Staff',
  '/assets': 'Assets',
  '/settings': 'Settings',
  '/clock-in': 'Clock In / Out',
};

export function Topbar() {
  const { profile, signOut, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  async function handleSignOut() {
    await signOut();
    navigate('/login');
    toast.success('Signed out');
  }

  return (
    <header className="flex items-center justify-between h-[60px] px-6 border-b border-line bg-paper flex-none">

      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-faint">{settings?.business_name ?? 'Charm Cafe'}</span>
        <span className="text-faint">/</span>
        <span className="font-semibold text-espresso">
          {PAGE_TITLES[location.pathname] ?? 'Workspace'}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">

        {/* Date chip */}
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
          {todayLabel()}
        </span>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-cream transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-caramel to-espresso grid place-items-center text-paper text-[10px] font-bold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-semibold text-espresso leading-tight">
                {profile?.full_name?.split(' ')[0] ?? 'User'}
              </p>
              <p className="text-[10px] text-muted">
                {isManager ? 'Manager' : 'Staff'}
              </p>
            </div>
            <ChevronDown
              size={13}
              className={cn('text-muted transition-transform', menuOpen && 'rotate-180')}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-20 w-48 bg-paper border border-line rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-[13px] font-semibold text-espresso">{profile?.full_name}</p>
                  <p className="text-[11px] text-muted mt-0.5">{isManager ? 'Store Manager' : 'Staff'}</p>
                </div>
                <div className="py-1">
                  {isManager && (
                    <button
                      onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] text-espresso hover:bg-cream transition-colors"
                    >
                      <Settings size={14} className="text-taupe" />
                      Settings
                    </button>
                  )}
                  <button
                    onClick={() => { navigate('/clock-in'); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] text-espresso hover:bg-cream transition-colors"
                  >
                    <User size={14} className="text-taupe" />
                    Clock In / Out
                  </button>
                  <div className="border-t border-line my-1" />
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12.5px] text-danger hover:bg-danger-soft transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
