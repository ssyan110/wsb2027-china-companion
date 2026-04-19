import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { ToastContainer } from './Toast';
import { useAppStore } from '../stores/app.store';

export function Layout() {
  const isOnline = useAppStore((s) => s.isOnline);

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {!isOnline && (
        <div className="offline-banner" role="status" aria-live="polite">
          ⚡ You are offline — showing cached data
        </div>
      )}
      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
