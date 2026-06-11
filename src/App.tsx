import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PrivateRoute } from '@/router/PrivateRoute';
import { ManagerRoute } from '@/router/ManagerRoute';

// Auth
import Login from '@/pages/auth/Login';

// Pages
import Dashboard from '@/pages/dashboard/index';
import StaffDashboard from '@/pages/staff-dashboard/index';
import POS from '@/pages/pos/index';
import Inventory from '@/pages/inventory/index';
import Products from '@/pages/products/index';
import Expenses from '@/pages/expenses/index';
import Analytics from '@/pages/analytics/index';
import StaffManagement from '@/pages/staff/index';
import ClockIn from '@/pages/clock-in/index';
import Assets from '@/pages/assets/index';
import SettingsPage from '@/pages/settings/index';

const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <Login /> },

  // Protected routes — requires auth
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          // Default redirect
          { path: '/', element: <Navigate to="/pos" replace /> },

          // Both roles
          { path: '/pos', element: <POS /> },
          { path: '/products', element: <Products /> },
          { path: '/clock-in', element: <ClockIn /> },
          { path: '/staff-dashboard', element: <StaffDashboard /> },

          // Staff with permissions or manager
          { path: '/inventory', element: <Inventory /> },
          { path: '/expenses', element: <Expenses /> },

          // Manager only
          {
            element: <ManagerRoute />,
            children: [
              { path: '/dashboard', element: <Dashboard /> },
              { path: '/analytics', element: <Analytics /> },
              { path: '/staff', element: <StaffManagement /> },
              { path: '/assets', element: <Assets /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
