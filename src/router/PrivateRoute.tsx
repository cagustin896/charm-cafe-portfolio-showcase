import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function PrivateRoute() {
  const { profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-caramel border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm font-medium">Loading Charm Cafe…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
