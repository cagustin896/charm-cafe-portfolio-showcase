import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout() {
  return (
    // Lock the shell to the viewport so the sidebar + cart stay fixed; only the
    // inner regions scroll. dvh keeps it correct under mobile/tablet browser UI.
    <div className="h-dvh overflow-hidden bg-cream p-4 flex gap-0">
      <Sidebar />

      {/* Workspace */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-paper border border-line rounded-r-2xl overflow-hidden">
        <Topbar />

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
