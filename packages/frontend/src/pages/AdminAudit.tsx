import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api';
import type { AuditLogEntry, AuditLogResponse } from '@wsb/shared/api-types';

export default function AdminAudit() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionType, setActionType] = useState('');
  const [staffId, setStaffId] = useState('');
  const [travelerId, setTravelerId] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (actionType) params.set('action_type', actionType);
      if (staffId) params.set('actor_id', staffId);
      if (travelerId) params.set('traveler_id', travelerId);

      const res = await apiClient<AuditLogResponse>(`/api/v1/admin/audit-logs?${params}`);
      setEntries(res.entries ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, startDate, endDate, actionType, staffId, travelerId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSearch() {
    setPage(1);
    loadLogs();
  }

  return (
    <div className="admin-page" data-testid="admin-audit">
      <h1 className="admin-title">Audit Log</h1>

      {/* Filters */}
      <div className="admin-audit-filters" role="search" aria-label="Audit log filters">
        <label>
          Start Date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Start date" />
        </label>
        <label>
          End Date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" />
        </label>
        <label>
          Action Type
          <input placeholder="e.g. scan, import, update" value={actionType} onChange={(e) => setActionType(e.target.value)} aria-label="Action type" />
        </label>
        <label>
          Staff ID
          <input placeholder="Actor/Staff ID" value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Staff ID" />
        </label>
        <label>
          Traveler ID
          <input placeholder="Traveler ID" value={travelerId} onChange={(e) => setTravelerId(e.target.value)} aria-label="Traveler ID" />
        </label>
        <button className="admin-btn admin-btn-primary" onClick={handleSearch}>Search</button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <>
          <p className="admin-result-count">{total} result(s)</p>
          <table className="admin-table" aria-label="Audit log entries">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.audit_id}>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                  <td>{e.actor_id}</td>
                  <td>{e.actor_role}</td>
                  <td>{e.action_type}</td>
                  <td>{e.entity_type}</td>
                  <td>{e.entity_id}</td>
                  <td><pre className="admin-details-pre">{JSON.stringify(e.details, null, 2)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="admin-pagination" aria-label="Pagination">
            <button className="admin-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="admin-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
