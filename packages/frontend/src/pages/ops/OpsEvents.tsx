import { useEffect, useMemo, useCallback } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../lib/api';

interface EventGroup {
  event_name: string;
  attendees: Array<{
    traveler_id: string;
    first_name: string;
    last_name: string;
    fleet_number: string | null;
    attended: boolean | null;
  }>;
}

export function OpsEvents() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const data = useOpsPanelStore((s) => s.data);
  const loading = useOpsPanelStore((s) => s.loading);
  const fetchData = useOpsPanelStore((s) => s.fetchData);

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  const toggleAttendance = useCallback(async (travelerId: string, eventName: string, attended: boolean) => {
    try {
      await apiClient('/api/v1/admin/event-attendance', {
        method: 'PATCH',
        body: JSON.stringify({ traveler_id: travelerId, event_name: eventName, attended }),
      });
      // Refresh data to reflect the change
      fetchData();
    } catch { /* ignore errors */ }
  }, [fetchData]);

  const eventGroups = useMemo(() => {
    const map = new Map<string, EventGroup>();
    for (const row of data) {
      if (!row.event_attendance) continue;
      for (const ev of row.event_attendance) {
        const name = ev.event_name;
        if (!map.has(name)) {
          map.set(name, { event_name: name, attendees: [] });
        }
        map.get(name)!.attendees.push({
          traveler_id: row.traveler_id,
          first_name: row.first_name ?? '',
          last_name: row.last_name ?? '',
          fleet_number: ev.fleet_number ?? null,
          attended: ev.attended ?? null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.event_name.localeCompare(b.event_name));
  }, [data]);

  return (
    <div data-testid="ops-events-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Event Attendance</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Per-event fleet numbers and attendance tracking for all travelers.
      </p>

      {!isSuperAdmin && (
        <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
          🔒 View Only
        </div>
      )}

      {loading && <div style={{ color: '#666' }}>Loading…</div>}

      {!loading && eventGroups.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No event data found.</div>
      )}

      {eventGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {eventGroups.map((eg) => {
            const attendedCount = eg.attendees.filter((a) => a.attended === true).length;
            return (
              <div key={eg.event_name} style={{ border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f5f5f5' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>📅 {eg.event_name}</span>
                    <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#666' }}>
                      {attendedCount}/{eg.attendees.length} attended
                    </span>
                  </div>
                  {isSuperAdmin && (
                    <button style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th style={{ textAlign: 'left', padding: '0.4rem 1rem' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem' }}>Fleet #</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>Attended</th>
                      {isSuperAdmin && <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {eg.attendees.map((a) => (
                      <tr key={a.traveler_id} style={{ borderTop: '1px solid #eee' }}>
                        <td style={{ padding: '0.3rem 1rem' }}>{a.first_name} {a.last_name}</td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>{a.fleet_number ?? '—'}</td>
                        <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                          {a.attended === true ? '✅' : a.attended === false ? '❌' : '—'}
                        </td>
                        {isSuperAdmin && (
                          <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleAttendance(a.traveler_id, eg.event_name, !(a.attended === true))}
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', border: '1px solid #ccc', borderRadius: 4, background: a.attended === true ? '#fee2e2' : '#dcfce7', cursor: 'pointer' }}
                            >
                              {a.attended === true ? 'Mark Absent' : 'Mark Attended'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OpsEvents;
