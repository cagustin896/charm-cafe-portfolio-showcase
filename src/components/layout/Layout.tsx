import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-cream p-4 flex gap-0">
      <Sidebar />

      {/* Workspace */}
      <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-2rem)] bg-paper border border-line rounded-r-2xl overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
