import { useState } from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { ToastContainer } from '../Toast';

const NAV_ITEMS = [
  { to: '/ops/travelers', label: 'Master Table', icon: '📋', superAdminOnly: false },
  { to: '/ops/rooms', label: 'Rooms', icon: '🏨', superAdminOnly: false },
  { to: '/ops/flights', label: 'Flights', icon: '✈️', superAdminOnly: false },
  { to: '/ops/events', label: 'Events', icon: '📅', superAdminOnly: false },
  { to: '/ops/audit', label: 'Audit Log', icon: '📝', superAdminOnly: true },
];

export function OpsLayout() {
  const role = useAuthStore((s) => s.role);
  const unmaskPii = useOpsPanelStore((s) => s.unmaskPii);
  const setUnmaskPii = useOpsPanelStore((s) => s.setUnmaskPii);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSuperAdmin = role === 'super_admin';

  // Role guard: only admin and super_admin may access /ops/*
  if (role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  // Filter nav items based on role
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  return (
    <div className="ops-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="ops-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={`ops-sidebar${sidebarOpen ? ' ops-sidebar-open' : ''}`}
        aria-label="Operations navigation"
      >
        <div className="ops-sidebar-brand">
          Ops Panel
        </div>
        <ul className="ops-sidebar-nav">
          {visibleNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `ops-nav-link${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="ops-nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content area */}
      <div className="ops-main-area">
        {/* Header */}
        <header className="ops-header">
          <button
            className="ops-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={sidebarOpen}
          >
            <span className="ops-hamburger-line" />
            <span className="ops-hamburger-line" />
            <span className="ops-hamburger-line" />
          </button>

          <h1 className="ops-header-title">Operations Panel</h1>

          {/* Role badge */}
          <span
            data-testid="role-badge"
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 12,
              fontSize: '0.75rem',
              fontWeight: 600,
              background: isSuperAdmin ? '#e8f5e9' : '#fff3e0',
              color: isSuperAdmin ? '#2e7d32' : '#e65100',
              marginLeft: 'auto',
              marginRight: '0.75rem',
            }}
          >
            {isSuperAdmin ? 'Super Admin' : 'Admin (View Only)'}
          </span>

          {isSuperAdmin && (
            <label className="ops-unmask-toggle">
              <input
                type="checkbox"
                checked={unmaskPii}
                onChange={(e) => setUnmaskPii(e.target.checked)}
                aria-label="Unmask PII"
              />
              Unmask PII
            </label>
          )}
        </header>

        {/* Child route content */}
        <main className="ops-content">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
