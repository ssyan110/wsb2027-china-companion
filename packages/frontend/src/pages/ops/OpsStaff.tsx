import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';

interface StaffMember {
  traveler_id: string;
  first_name: string;
  last_name: string;
  full_name_raw: string;
  email_primary: string;
  role_type: string;
  permissions: string[];
}

const ALL_PERMISSIONS = ['scanner', 'master_table', 'hotels', 'flights', 'events', 'audit_log'] as const;

const PERM_LABELS: Record<string, string> = {
  scanner: 'Scanner',
  master_table: 'Master Table',
  hotels: 'Hotels',
  flights: 'Flights',
  events: 'Events',
  audit_log: 'Audit Log',
};

export function OpsStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', role_type: 'staff' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await apiClient<{ staff: StaffMember[] }>('/api/v1/admin/staff');
      setStaff(res.staff);
    } catch {
      setError('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const togglePermission = async (member: StaffMember, perm: string) => {
    const current = member.permissions || [];
    const updated = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm];

    try {
      await apiClient(`/api/v1/admin/staff/${member.traveler_id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: updated }),
      });
      setStaff(prev => prev.map(s =>
        s.traveler_id === member.traveler_id ? { ...s, permissions: updated } : s
      ));
    } catch {
      setError('Failed to update permissions');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiClient('/api/v1/admin/staff', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setShowCreate(false);
      setCreateForm({ first_name: '', last_name: '', email: '', role_type: 'staff' });
      await fetchStaff();
    } catch {
      setError('Failed to create staff account');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="ops-loading">Loading staff...</div>;

  return (
    <div className="ops-staff">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Staff Management</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '0.5rem 1rem', background: '#1976d2', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
          }}
        >
          {showCreate ? 'Cancel' : '+ Create Staff Account'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: '#ffebee', color: '#c62828', borderRadius: 6, marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} style={{
          padding: '1rem', background: '#f5f5f5', borderRadius: 8, marginBottom: '1rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
        }}>
          <input
            placeholder="First Name" required value={createForm.first_name}
            onChange={e => setCreateForm(f => ({ ...f, first_name: e.target.value }))}
            style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
          <input
            placeholder="Last Name" required value={createForm.last_name}
            onChange={e => setCreateForm(f => ({ ...f, last_name: e.target.value }))}
            style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
          <input
            placeholder="Email" type="email" required value={createForm.email}
            onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
            style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
          <select
            value={createForm.role_type}
            onChange={e => setCreateForm(f => ({ ...f, role_type: e.target.value }))}
            style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="staff">Staff</option>
            <option value="staff_desk">Staff Desk</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit" disabled={creating}
            style={{
              gridColumn: '1 / -1', padding: '0.5rem', background: '#2e7d32', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
            }}
          >
            {creating ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
              {ALL_PERMISSIONS.map(p => (
                <th key={p} style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{PERM_LABELS[p]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(member => (
              <tr key={member.traveler_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{member.full_name_raw || `${member.first_name} ${member.last_name}`}</td>
                <td style={{ padding: '0.5rem' }}>{member.email_primary}</td>
                <td style={{ padding: '0.5rem' }}>
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                    background: member.role_type === 'super_admin' ? '#e8f5e9' : member.role_type === 'admin' ? '#fff3e0' : '#e3f2fd',
                    color: member.role_type === 'super_admin' ? '#2e7d32' : member.role_type === 'admin' ? '#e65100' : '#1565c0',
                  }}>
                    {member.role_type}
                  </span>
                </td>
                {ALL_PERMISSIONS.map(perm => (
                  <td key={perm} style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={(member.permissions || []).includes(perm)}
                      onChange={() => togglePermission(member, perm)}
                      disabled={member.role_type === 'super_admin'}
                      aria-label={`${PERM_LABELS[perm]} permission for ${member.full_name_raw}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={3 + ALL_PERMISSIONS.length} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No staff accounts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
