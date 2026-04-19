import { useEffect, useMemo, useState } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';
import type { ExtendedMasterListRow } from '@wsb/shared';

interface HotelSummary {
  name: string;
  totalTravelers: number;
  roomCount: number;
  singles: number;
  doubles: number;
  twins: number;
  triples: number;
}

const ROOM_SEQ_COLORS = [
  '#e3f2fd', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5',
  '#e0f7fa', '#fff9c4', '#fbe9e7', '#ede7f6', '#e0f2f1',
];

export function OpsRooms() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const data = useOpsPanelStore((s) => s.data);
  const loading = useOpsPanelStore((s) => s.loading);
  const fetchData = useOpsPanelStore((s) => s.fetchData);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  // Build hotel summaries
  const hotelSummaries = useMemo(() => {
    const map = new Map<string, { travelers: Set<string>; rooms: Set<string>; singles: number; doubles: number; twins: number; triples: number }>();

    for (const row of data) {
      const hotelName = row.room_assignment?.hotel_name;
      const hotelNames: string[] = hotelName ? [hotelName] : (row.hotels?.length ? row.hotels : []);

      for (const name of hotelNames) {
        if (!map.has(name)) {
          map.set(name, { travelers: new Set(), rooms: new Set(), singles: 0, doubles: 0, twins: 0, triples: 0 });
        }
        const entry = map.get(name)!;
        entry.travelers.add(row.traveler_id);

        if (row.room_assignment?.hotel_name === name && row.room_assignment.room_number) {
          entry.rooms.add(row.room_assignment.room_number);
          // Count room types only once per room
          const occ = row.room_assignment.occupancy;
          if (occ === 'single') entry.singles++;
          else if (occ === 'double') entry.doubles++;
          else if (occ === 'twin') entry.twins++;
          else if (occ === 'triple') entry.triples++;
        }
      }
    }

    const summaries: HotelSummary[] = [];
    for (const [name, entry] of map) {
      summaries.push({
        name,
        totalTravelers: entry.travelers.size,
        roomCount: entry.rooms.size,
        singles: entry.singles,
        doubles: entry.doubles,
        twins: entry.twins,
        triples: entry.triples,
      });
    }
    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Get travelers for selected hotel
  const hotelTravelers = useMemo(() => {
    if (!selectedHotel) return [];
    return data.filter((row) => {
      if (row.room_assignment?.hotel_name === selectedHotel) return true;
      if (row.hotels?.includes(selectedHotel)) return true;
      return false;
    });
  }, [data, selectedHotel]);

  // Group travelers by room_assignment_seq for coloring
  const seqColorMap = useMemo(() => {
    const map = new Map<number, string>();
    let colorIdx = 0;
    for (const row of hotelTravelers) {
      const seq = row.room_assignment?.room_assignment_seq;
      if (seq != null && !map.has(seq)) {
        map.set(seq, ROOM_SEQ_COLORS[colorIdx % ROOM_SEQ_COLORS.length]);
        colorIdx++;
      }
    }
    return map;
  }, [hotelTravelers]);

  // Room types in this hotel
  const roomTypes = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of hotelTravelers) {
      const rt = row.room_assignment?.paid_room_type;
      if (rt) map.set(rt, (map.get(rt) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [hotelTravelers]);

  // Sort travelers: group by room_assignment_seq, then by name
  const sortedTravelers = useMemo(() => {
    return [...hotelTravelers].sort((a, b) => {
      const seqA = a.room_assignment?.room_assignment_seq ?? 99999;
      const seqB = b.room_assignment?.room_assignment_seq ?? 99999;
      if (seqA !== seqB) return seqA - seqB;
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    });
  }, [hotelTravelers]);

  // --- RENDER ---

  if (selectedHotel) {
    return (
      <div data-testid="ops-rooms-page" style={{ padding: '1.5rem' }}>
        <button
          data-testid="back-to-hotels"
          onClick={() => setSelectedHotel(null)}
          style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 }}
        >
          ← Back to Hotels
        </button>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedHotel}</h1>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {hotelTravelers.length} travelers
        </p>

        {!isSuperAdmin && (
          <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
            🔒 View Only
          </div>
        )}

        {/* Room Types */}
        {roomTypes.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Room Types</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {roomTypes.map(([type, count]) => (
                <span key={type} style={{ padding: '0.3rem 0.75rem', background: '#f5f5f5', borderRadius: 16, fontSize: '0.8rem', fontWeight: 500 }}>
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Travelers Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>Room #</th>
                <th style={{ padding: '0.5rem' }}>Occupancy</th>
                <th style={{ padding: '0.5rem' }}>Room Type</th>
                <th style={{ padding: '0.5rem' }}>Confirmation #</th>
                <th style={{ padding: '0.5rem' }}>Roommates</th>
                <th style={{ padding: '0.5rem' }}>Check-in</th>
                {isSuperAdmin && <th style={{ padding: '0.5rem' }}></th>}
              </tr>
            </thead>
            <tbody>
              {sortedTravelers.map((row) => {
                const seq = row.room_assignment?.room_assignment_seq;
                const bgColor = seq != null ? seqColorMap.get(seq) : undefined;
                return (
                  <tr key={row.traveler_id} style={{ borderBottom: '1px solid #eee', background: bgColor }}>
                    <td style={{ padding: '0.5rem' }}>{row.first_name} {row.last_name}</td>
                    <td style={{ padding: '0.5rem' }}>{row.room_assignment?.room_number ?? '—'}</td>
                    <td style={{ padding: '0.5rem' }}>{row.room_assignment?.occupancy ?? '—'}</td>
                    <td style={{ padding: '0.5rem' }}>{row.room_assignment?.paid_room_type ?? '—'}</td>
                    <td style={{ padding: '0.5rem' }}>{row.room_assignment?.hotel_confirmation_no ?? '—'}</td>
                    <td style={{ padding: '0.5rem' }}>{row.room_assignment?.preferred_roommates ?? '—'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 500,
                        background: row.checkin_status === 'checked_in' ? '#e8f5e9' : row.checkin_status === 'no_show' ? '#ffebee' : '#fff3e0',
                        color: row.checkin_status === 'checked_in' ? '#2e7d32' : row.checkin_status === 'no_show' ? '#c62828' : '#e65100',
                      }}>
                        {row.checkin_status ?? 'pending'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: '0.5rem' }}>
                        <button style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}>
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Level 1: Hotel List
  return (
    <div data-testid="ops-rooms-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Hotels</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Hotel overview with room assignments and traveler counts.
      </p>

      {!isSuperAdmin && (
        <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
          🔒 View Only
        </div>
      )}

      {loading && <div style={{ color: '#666' }}>Loading…</div>}

      {!loading && hotelSummaries.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No hotel data found.</div>
      )}

      {hotelSummaries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {hotelSummaries.map((hotel) => (
            <div
              key={hotel.name}
              data-testid={`hotel-card-${hotel.name}`}
              onClick={() => setSelectedHotel(hotel.name)}
              style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', background: '#fff', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>🏨 {hotel.name}</span>
                {isSuperAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}
                  >
                    Add Room Type
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.25rem' }}>
                {hotel.totalTravelers} travelers · {hotel.roomCount} rooms
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {hotel.singles > 0 && <span>Singles: {hotel.singles}</span>}
                {hotel.doubles > 0 && <span>Doubles: {hotel.doubles}</span>}
                {hotel.twins > 0 && <span>Twins: {hotel.twins}</span>}
                {hotel.triples > 0 && <span>Triples: {hotel.triples}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OpsRooms;
