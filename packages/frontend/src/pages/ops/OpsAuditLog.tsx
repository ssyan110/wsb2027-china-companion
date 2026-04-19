import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../lib/api';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  details: string;
}

export function OpsAuditLog() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);
    apiClient<{ data: AuditEntry[] }>('/api/v1/admin/audit-logs')
      .then((res) => { setEntries(res.data); setError(null); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  // Role guard
  if (!isSuperAdmin) {
    return (
      <div data-testid="ops-audit-log-page" style={{ padding: '1.5rem' }}>
        <div data-testid="access-denied" style={{
          padding: '2rem', textAlign: 'center', background: '#fce4ec', borderRadius: 8, color: '#c62828',
        }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🚫 Access Denied</h2>
          <p>You do not have permission to view the audit log. This page is restricted to Super Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ops-audit-log-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Audit Log</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        All data mutations made through the admin panel.
      </p>

      {loading && <div style={{ color: '#666' }}>Loading…</div>}
      {error && (
        <div style={{ padding: '0.5rem 1rem', background: '#f8d7da', color: '#721c24', borderRadius: 4, marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No audit entries found.</div>
      )}

      {entries.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #ccc' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #ccc' }}>Actor</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #ccc' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #ccc' }}>Entity</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '2px solid #ccc' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.4rem 0.75rem' }}>{entry.actor}</td>
                  <td style={{ padding: '0.4rem 0.75rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                      background: entry.action === 'delete' ? '#fce4ec' : entry.action === 'create' ? '#e8f5e9' : '#e3f2fd',
                      color: entry.action === 'delete' ? '#c62828' : entry.action === 'create' ? '#2e7d32' : '#1565c0',
                    }}>
                      {entry.action}
                    </span>
                  </td>
                  <td style={{ padding: '0.4rem 0.75rem' }}>{entry.entity}</td>
                  <td style={{ padding: '0.4rem 0.75rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OpsAuditLog;
