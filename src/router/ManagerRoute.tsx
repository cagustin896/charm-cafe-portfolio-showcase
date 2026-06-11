import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectIsManager } from '@/stores/authStore';

export function ManagerRoute() {
  const isManager = useAuthStore(selectIsManager);
  const { isLoading } = useAuthStore();

  if (isLoading) return null;

  if (!isManager) {
    return <Navigate to="/pos" replace />;
  }

  return <Outlet />;
}
