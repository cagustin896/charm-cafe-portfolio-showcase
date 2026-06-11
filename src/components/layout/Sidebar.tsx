import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Coffee,
  Receipt,
  BarChart2,
  Users,
  Wrench,
  Settings,
  Clock,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BrandLogo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore, selectIsManager, selectCanViewInventory, selectCanAddExpenses } from '@/stores/authStore';
import { getSettings } from '@/services/settingsService';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  managerOnly?: boolean;
  inventoryPermission?: boolean;
  expensePermission?: boolean;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, managerOnly: true },
  { label: 'My Day', path: '/staff-dashboard', icon: LayoutDashboard },
  { label: 'Point of Sale', path: '/pos', icon: ShoppingCart },
  { label: 'Products', path: '/products', icon: Coffee },
  { label: 'Inventory', path: '/inventory', icon: Package, inventoryPermission: true },
];

const backOfficeNav: NavItem[] = [
  { label: 'Expenses', path: '/expenses', icon: Receipt, expensePermission: true },
  { label: 'Analytics', path: '/analytics', icon: BarChart2, managerOnly: true },
  { label: 'Staff', path: '/staff', icon: Users, managerOnly: true },
  { label: 'Assets', path: '/assets', icon: Wrench, managerOnly: true },
  { label: 'Settings', path: '/settings', icon: Settings, managerOnly: true },
];

export function Sidebar() {
  const { signOut, profile } = useAuth();
  const isManager = useAuthStore(selectIsManager);
  const canViewInventory = useAuthStore(selectCanViewInventory);
  const canAddExpenses = useAuthStore(selectCanAddExpenses);
  const navigate = useNavigate();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  async function handleSignOut() {
    await signOut();
    navigate('/login');
    toast.success('Signed out successfully');
  }

  function canSee(item: NavItem): boolean {
    if (item.managerOnly && !isManager) return false;
    if (item.inventoryPermission && !canViewInventory) return false;
    if (item.expensePermission && !canAddExpenses) return false;
    // Hide staff-only items from manager and vice versa
    if (item.path === '/staff-dashboard' && isManager) return false;
    if (item.path === '/dashboard' && !isManager) return false;
    return true;
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  return (
    <aside className="flex flex-col min-h-[calc(100vh-2rem)] w-[224px] bg-dark-roast rounded-l-2xl overflow-hidden select-none">

      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.08]">
        <div className="flex-none w-10 h-10 rounded-full bg-paper grid place-items-center shadow-sm">
          <BrandLogo size={30} />
        </div>
        <div className="min-w-0">
          <p className="text-paper font-heading text-[15px] font-semibold leading-tight truncate">
            {settings?.business_name ?? 'Charm Cafe'}
          </p>
          <p className="text-taupe/80 text-[10px] font-medium tracking-wide truncate mt-0.5">
            {settings?.tagline ?? 'A little charm in every cup'}
          </p>
        </div>
      </div>

      {/* User Card */}
      {profile && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.07] flex items-center gap-2.5">
          <div className="flex-none w-8 h-8 rounded-full bg-gradient-to-br from-caramel to-espresso grid place-items-center text-paper text-[11px] font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-paper text-[12px] font-semibold leading-tight truncate">
              {profile.full_name}
            </p>
            <p className="text-taupe/80 text-[10px] mt-0.5">
              {profile.cafe_role === 'manager' ? 'Store Manager' : 'Staff'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2 pb-1.5 pt-2 text-[9.5px] font-bold tracking-widest uppercase text-white/25">
          Main
        </p>

        {mainNav.filter(canSee).map((item) => (
          <SidebarLink key={item.path} item={item} />
        ))}

        <p className="px-2 pb-1.5 pt-4 text-[9.5px] font-bold tracking-widest uppercase text-white/25">
          Back Office
        </p>

        {backOfficeNav.filter(canSee).map((item) => (
          <SidebarLink key={item.path} item={item} />
        ))}

        <p className="px-2 pb-1.5 pt-4 text-[9.5px] font-bold tracking-widest uppercase text-white/25">
          Utility
        </p>

        <SidebarLink item={{ label: 'Clock In / Out', path: '/clock-in', icon: Clock }} />
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/[0.08] pt-3">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-taupe hover:text-paper hover:bg-white/[0.07] transition-colors text-[12px] font-medium"
        >
          <LogOut size={14} className="flex-none" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg text-[12.5px] font-medium transition-all duration-150',
          isActive
            ? 'bg-caramel text-paper shadow-[0_2px_8px_rgba(164,124,88,0.35)]'
            : 'text-taupe hover:text-paper hover:bg-white/[0.07]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={15}
            className={cn(
              'flex-none transition-colors',
              isActive ? 'text-paper' : 'text-taupe/80 group-hover:text-paper/70'
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {isActive && <ChevronRight size={12} className="flex-none opacity-60" />}
        </>
      )}
    </NavLink>
  );
}
