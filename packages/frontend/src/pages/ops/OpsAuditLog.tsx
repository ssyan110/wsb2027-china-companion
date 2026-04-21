import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../lib/api';

interface AuditEntry {
  audit_id: string;
  actor_id: string | null;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  page_size: number;
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  'traveler.field_update': { bg: '#e3f2fd', color: '#1565c0' },
  'traveler.checkin_update': { bg: '#e8f5e9', color: '#2e7d32' },
  'master_list.view': { bg: '#f5f5f5', color: '#666' },
  'master_list.view_unmasked': { bg: '#fff3e0', color: '#e65100' },
  'master_list.export': { bg: '#f3e5f5', color: '#7b1fa2' },
};

function formatDetails(details: Record<string, unknown>): string {
  if (!details) return '—';
  if (details.field) {
    return `${details.field}: ${JSON.stringify(details.previous_value)} → ${JSON.stringify(details.new_value)}`;
  }
  if (details.record_count != null) return `Exported ${details.record_count} records`;
  if (details.search) return `Search: "${details.search}"`;
  return JSON.stringify(details).slice(0, 120);
}

export function OpsAuditLog() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = (p: number) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(p));
    params.set('page_size', '50');
    if (filterAction) params.set('action_type', filterAction);

    apiClient<AuditResponse>(`/api/v1/admin/audit-logs?${params}`)
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
        setPage(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isSuperAdmin) fetchLogs(1);
  }, [isSuperAdmin, filterAction]);

  if (!isSuperAdmin) {
    return (
      <div data-testid="ops-audit-log-page" style={{ padding: '1.5rem' }}>
        <div style={{ padding: '2rem', textAlign: 'center', background: '#fce4ec', borderRadius: 8, color: '#c62828' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🚫 Access Denied</h2>
          <p>Audit log is restricted to Super Admins.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 50) || 1;

  return (
    <div data-testid="ops-audit-log-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Audit Log</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        {total} entries — all data changes and views.
      </p>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{ padding: '0.4rem 0.5rem', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.85rem' }}
        >
          <option value="">All Actions</option>
          <option value="traveler.field_update">Field Updates</option>
          <option value="traveler.checkin_update">Check-in Changes</option>
          <option value="master_list.view">Master List Views</option>
          <option value="master_list.export">Exports</option>
        </select>
      </div>

      {loading && <div style={{ color: '#666', padding: '1rem 0' }}>Loading…</div>}
      {error && <div style={{ padding: '0.5rem 1rem', background: '#f8d7da', color: '#721c24', borderRadius: 4, marginBottom: '0.75rem' }}>{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No audit entries found.</div>
      )}

      {entries.length > 0 && (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid #ccc' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid #ccc' }}>Actor</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid #ccc' }}>Action</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid #ccc' }}>Entity</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid #ccc' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const ac = ACTION_COLORS[e.action_type] ?? { bg: '#f5f5f5', color: '#666' };
                  return (
                    <tr key={e.audit_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                        {e.actor_id ? e.actor_id.slice(0, 8) + '…' : '—'}
                        <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem', color: '#999' }}>{e.actor_role}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, background: ac.bg, color: ac.color }}>
                          {e.action_type}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                        {e.entity_type}
                        {e.entity_id && <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem', color: '#999' }}>{e.entity_id.slice(0, 8)}…</span>}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {formatDetails(e.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', fontSize: '0.85rem' }}>
            <span>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)} style={{ padding: '0.3rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: page > 1 ? 'pointer' : 'not-allowed' }}>← Prev</button>
              <button disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)} style={{ padding: '0.3rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: page < totalPages ? 'pointer' : 'not-allowed' }}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OpsAuditLog;
