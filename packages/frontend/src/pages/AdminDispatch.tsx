import { useState } from 'react';
import { apiClient } from '../lib/api';
import type { DispatchProposal, DispatchCommitRequest } from '@wsb/shared/api-types';

interface ProposedAssignment {
  traveler_id: string;
  bus_id: string;
  bus_number: string;
  traveler_name?: string;
  terminal?: string;
  arrival_time?: string;
}

export default function AdminDispatch() {
  const [eventId, setEventId] = useState('');
  const [proposals, setProposals] = useState<ProposedAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');
  const [committed, setCommitted] = useState(false);

  async function handleAutoDispatch() {
    if (!eventId.trim()) {
      setError('Please enter an event ID');
      return;
    }
    setLoading(true);
    setError('');
    setCommitted(false);
    try {
      const res = await apiClient<DispatchProposal>('/api/v1/admin/dispatch/auto', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId }),
      });
      setProposals(res.proposed_assignments as ProposedAssignment[]);
    } catch {
      setError('Auto-dispatch failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!confirm('Commit these bus assignments? This will update traveler itineraries.')) return;
    setCommitting(true);
    setError('');
    try {
      const body: DispatchCommitRequest = {
        assignments: proposals.map((p) => ({ traveler_id: p.traveler_id, bus_id: p.bus_id })),
      };
      await apiClient('/api/v1/admin/dispatch/commit', { method: 'POST', body: JSON.stringify(body) });
      setCommitted(true);
    } catch {
      setError('Failed to commit assignments');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="admin-page" data-testid="admin-dispatch">
      <h1 className="admin-title">Bus Dispatch</h1>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Event ID for dispatch"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          aria-label="Event ID"
        />
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleAutoDispatch}
          disabled={loading}
        >
          {loading ? 'Running…' : '🚌 Auto-Dispatch'}
        </button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {proposals.length > 0 && (
        <>
          <table className="admin-table" aria-label="Proposed assignments">
            <thead>
              <tr>
                <th>Traveler ID</th>
                <th>Bus</th>
                <th>Terminal</th>
                <th>Arrival</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.traveler_id}>
                  <td>{p.traveler_name ?? p.traveler_id}</td>
                  <td>{p.bus_number}</td>
                  <td>{p.terminal ?? '—'}</td>
                  <td>{p.arrival_time ? new Date(p.arrival_time).toLocaleTimeString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-dispatch-actions">
            <p>{proposals.length} traveler(s) assigned</p>
            {committed ? (
              <p className="admin-success" role="status">✅ Assignments committed successfully</p>
            ) : (
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleCommit}
                disabled={committing}
                data-testid="commit-btn"
              >
                {committing ? 'Committing…' : 'Commit Assignments'}
              </button>
            )}
          </div>
        </>
      )}

      {!loading && proposals.length === 0 && (
        <p className="admin-empty">Enter an event ID and run auto-dispatch to see proposed assignments.</p>
      )}
    </div>
  );
}
