import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useOpsPanelStore } from '../../stores/ops-panel.store';

const NAV_ITEMS = [
  { to: '/ops/travelers', label: 'Master Table' },
  { to: '/ops/rooms', label: 'Rooms' },
  { to: '/ops/flights', label: 'Flights' },
  { to: '/ops/events', label: 'Events' },
  { to: '/ops/audit', label: 'Audit Log' },
] as const;

export function OpsLayout() {
  const role = useAuthStore((s) => s.role);
  const unmaskPii = useOpsPanelStore((s) => s.unmaskPii);
  const setUnmaskPii = useOpsPanelStore((s) => s.setUnmaskPii);

  // Role guard: only admin and super_admin may access /ops/*
  if (role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="ops-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav className="ops-sidebar" aria-label="Operations navigation" style={{
        width: 220,
        background: '#1a1a2e',
        color: '#fff',
        padding: '1rem 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 1rem 1rem', fontWeight: 700, fontSize: '1.1rem' }}>
          Ops Panel
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `ops-nav-link${isActive ? ' active' : ''}`}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '0.6rem 1rem',
                  color: isActive ? '#4fc3f7' : '#ccc',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(79,195,247,0.1)' : 'transparent',
                })}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header className="ops-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid #e0e0e0',
          background: '#fafafa',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Operations Panel</h1>

          {role === 'super_admin' && (
            <label className="ops-unmask-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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
        <main className="ops-content" style={{ flex: 1, padding: '1rem 1.5rem', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
