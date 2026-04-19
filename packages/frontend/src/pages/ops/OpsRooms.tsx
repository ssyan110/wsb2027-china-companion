import { useEffect, useMemo, useState } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';

interface RoomGroup {
  room_number: string;
  occupancy: string;
  paid_room_type: string;
  hotel_confirmation_no: string;
  travelers: Array<{ traveler_id: string; first_name: string; last_name: string; gender: string }>;
}

export function OpsRooms() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const data = useOpsPanelStore((s) => s.data);
  const loading = useOpsPanelStore((s) => s.loading);
  const fetchData = useOpsPanelStore((s) => s.fetchData);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  const roomGroups = useMemo(() => {
    const map = new Map<string, RoomGroup>();
    for (const row of data) {
      const ra = row.room_assignment;
      if (!ra?.room_number) continue;
      const key = ra.room_number;
      if (!map.has(key)) {
        map.set(key, {
          room_number: ra.room_number,
          occupancy: ra.occupancy ?? '',
          paid_room_type: ra.paid_room_type ?? '',
          hotel_confirmation_no: ra.hotel_confirmation_no ?? '',
          travelers: [],
        });
      }
      map.get(key)!.travelers.push({
        traveler_id: row.traveler_id,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        gender: row.gender ?? '',
      });
    }
    return Array.from(map.values()).sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  }, [data]);

  return (
    <div data-testid="ops-rooms-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Room Assignments</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Room assignment view grouped by room number. Displays roommate pairings, occupancy types, and hotel confirmation numbers.
      </p>

      {!isSuperAdmin && (
        <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
          🔒 View Only
        </div>
      )}

      {loading && <div style={{ color: '#666' }}>Loading…</div>}

      {!loading && roomGroups.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No room assignments found.</div>
      )}

      {roomGroups.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {roomGroups.map((room) => (
            <div key={room.room_number} style={{
              border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', background: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>🏨 Room {room.room_number}</span>
                {isSuperAdmin && (
                  <button
                    data-testid={`edit-room-${room.room_number}`}
                    onClick={() => setEditingRoom(editingRoom === room.room_number ? null : room.room_number)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                {room.occupancy && <span style={{ marginRight: '1rem' }}>Occupancy: {room.occupancy}</span>}
                {room.paid_room_type && <span style={{ marginRight: '1rem' }}>Type: {room.paid_room_type}</span>}
              </div>
              {room.hotel_confirmation_no && (
                <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.5rem' }}>Conf: {room.hotel_confirmation_no}</div>
              )}
              <div style={{ borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                {room.travelers.map((t) => (
                  <div key={t.traveler_id} style={{ fontSize: '0.85rem', padding: '0.2rem 0' }}>
                    {t.first_name} {t.last_name} {t.gender && <span style={{ color: '#999' }}>({t.gender})</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OpsRooms;
