import { useState } from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { ToastContainer } from '../Toast';

const NAV_ITEMS = [
  { to: '/ops/travelers', label: 'Master Table', icon: '📋' },
  { to: '/ops/rooms', label: 'Rooms', icon: '🏨' },
  { to: '/ops/flights', label: 'Flights', icon: '✈️' },
  { to: '/ops/events', label: 'Events', icon: '📅' },
  { to: '/ops/audit', label: 'Audit Log', icon: '📝' },
] as const;

export function OpsLayout() {
  const role = useAuthStore((s) => s.role);
  const unmaskPii = useOpsPanelStore((s) => s.unmaskPii);
  const setUnmaskPii = useOpsPanelStore((s) => s.setUnmaskPii);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Role guard: only admin and super_admin may access /ops/*
  if (role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

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
          {NAV_ITEMS.map((item) => (
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

          {role === 'super_admin' && (
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
