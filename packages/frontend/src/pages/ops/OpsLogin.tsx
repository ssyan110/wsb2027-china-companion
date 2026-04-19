import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import type { RoleType } from '@wsb/shared';

interface DevUser {
  traveler_id: string;
  full_name_raw: string;
  email_primary: string;
  role_type: RoleType;
}

export function OpsLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  // If already logged in as admin, redirect to ops
  useEffect(() => {
    if (isAuthenticated && (role === 'admin' || role === 'super_admin')) {
      navigate('/ops', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    fetch('/api/v1/dev/users')
      .then((r) => r.json())
      .then((d: { users: DevUser[] }) => {
        // Only show admin/staff roles
        const adminRoles = ['super_admin', 'admin', 'staff', 'staff_desk'];
        const roleOrder: Record<string, number> = { super_admin: 0, admin: 1, staff: 2, staff_desk: 3 };
        setUsers(
          d.users
            .filter((u) => adminRoles.includes(u.role_type))
            .sort((a, b) => (roleOrder[a.role_type] ?? 9) - (roleOrder[b.role_type] ?? 9))
        );
      })
      .catch(() => {});
  }, []);

  const handleLogin = useCallback(async (id: string) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/v1/dev/login/${id}`);
      const data = await res.json() as { session_token: string; traveler_id: string; role_type: RoleType };
      login(data.session_token, data.traveler_id, data.role_type);
      navigate('/ops', { replace: true });
    } catch { setLoading(null); }
  }, [login, navigate]);

  const roleColors: Record<string, string> = {
    super_admin: '#d32f2f', admin: '#e65100', staff: '#1565c0', staff_desk: '#0277bd',
  };
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Admin', staff: 'Staff', staff_desk: 'Desk Staff',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '2rem 1.5rem',
        width: '100%', maxWidth: 420, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🛡️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Operations Login</h1>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>WSB 2027 China — Staff & Admin Access</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {users.map((u) => (
            <button
              key={u.traveler_id}
              type="button"
              disabled={loading !== null}
              onClick={() => handleLogin(u.traveler_id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', border: '1px solid #e0e0e0', borderRadius: 8,
                background: loading === u.traveler_id ? '#f5f5f5' : '#fff',
                cursor: loading ? 'wait' : 'pointer', textAlign: 'left', width: '100%',
                fontFamily: 'inherit', transition: 'background 0.15s',
              }}
              aria-label={`Log in as ${u.full_name_raw}`}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.full_name_raw}</div>
                <div style={{ fontSize: '0.75rem', color: '#999' }}>{u.email_primary}</div>
              </div>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 12,
                color: '#fff', background: roleColors[u.role_type] ?? '#666',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {loading === u.traveler_id ? '...' : roleLabels[u.role_type] ?? u.role_type}
              </span>
            </button>
          ))}
          {users.length === 0 && (
            <p style={{ color: '#999', textAlign: 'center', padding: '1rem 0' }}>Loading accounts...</p>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <Link to="/login" style={{ fontSize: '0.8rem', color: '#999', textDecoration: 'none' }}>
            ← Back to Traveler Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OpsLogin;
