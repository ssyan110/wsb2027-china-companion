import { useEffect, useMemo, useState } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';
import type { ExtendedMasterListRow } from '@wsb/shared';

interface FlightCard {
  key: string;
  airline: string;
  flight_number: string;
  time: string;
  airport: string;
  terminal: string;
  passengerCount: number;
}

interface FlightTraveler {
  traveler_id: string;
  first_name: string;
  last_name: string;
  booking_id: string;
  checkin_status: string;
  pax_type: string;
  groups: string[];
  hotels: string[];
}

export function OpsFlights() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const data = useOpsPanelStore((s) => s.data);
  const loading = useOpsPanelStore((s) => s.loading);
  const fetchData = useOpsPanelStore((s) => s.fetchData);
  const [direction, setDirection] = useState<'arrivals' | 'departures'>('arrivals');
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  // Build flight cards grouped by airline+flight_number
  const flightCards = useMemo(() => {
    const map = new Map<string, FlightCard & { travelers: FlightTraveler[] }>();
    for (const row of data) {
      const flight = direction === 'arrivals' ? row.arrival_flight : row.departure_flight;
      if (!flight?.flight_number) continue;
      const key = `${flight.airline ?? ''}-${flight.flight_number}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          airline: flight.airline ?? '',
          flight_number: flight.flight_number,
          time: flight.time ?? '',
          airport: flight.airport ?? '',
          terminal: flight.terminal ?? '',
          passengerCount: 0,
          travelers: [],
        });
      }
      const entry = map.get(key)!;
      entry.passengerCount++;
      entry.travelers.push({
        traveler_id: row.traveler_id,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        booking_id: row.booking_id ?? '',
        checkin_status: row.checkin_status ?? 'pending',
        pax_type: row.pax_type ?? 'adult',
        groups: row.groups ?? [],
        hotels: row.room_assignment?.hotel_name ? [row.room_assignment.hotel_name] : (row.hotels ?? []),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [data, direction]);

  // Get selected flight data
  const selectedFlightData = useMemo(() => {
    if (!selectedFlight) return null;
    return flightCards.find((f) => f.key === selectedFlight) ?? null;
  }, [flightCards, selectedFlight]);

  // Group travelers by group, then by hotel
  const groupedTravelers = useMemo(() => {
    if (!selectedFlightData) return [];
    const groupMap = new Map<string, FlightTraveler[]>();

    for (const t of selectedFlightData.travelers) {
      const groupNames = t.groups.length > 0 ? t.groups : ['Unassigned'];
      for (const g of groupNames) {
        if (!groupMap.has(g)) groupMap.set(g, []);
        groupMap.get(g)!.push(t);
      }
    }

    // Sort groups: named first, Unassigned last
    const entries = Array.from(groupMap.entries()).sort((a, b) => {
      if (a[0] === 'Unassigned') return 1;
      if (b[0] === 'Unassigned') return -1;
      return a[0].localeCompare(b[0]);
    });

    return entries.map(([groupName, travelers]) => {
      // Sub-group by hotel
      const hotelMap = new Map<string, FlightTraveler[]>();
      for (const t of travelers) {
        const hotelName = t.hotels.length > 0 ? t.hotels[0] : 'No Hotel';
        if (!hotelMap.has(hotelName)) hotelMap.set(hotelName, []);
        hotelMap.get(hotelName)!.push(t);
      }
      return {
        groupName,
        count: travelers.length,
        hotels: Array.from(hotelMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      };
    });
  }, [selectedFlightData]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', border: 'none', borderBottom: active ? '2px solid #1976d2' : '2px solid transparent',
    background: 'none', fontWeight: active ? 600 : 400, color: active ? '#1976d2' : '#666',
    cursor: 'pointer', fontSize: '0.9rem',
  });

  // --- Level 2: Flight Detail ---
  if (selectedFlight && selectedFlightData) {
    return (
      <div data-testid="ops-flights-page" style={{ padding: '1.5rem' }}>
        <button
          data-testid="back-to-flights"
          onClick={() => setSelectedFlight(null)}
          style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 }}
        >
          ← Back to Flights
        </button>

        {/* Flight info header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {selectedFlightData.airline} {selectedFlightData.flight_number}
          </h1>
          <div style={{ fontSize: '0.9rem', color: '#666', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {selectedFlightData.time && <span>🕐 {selectedFlightData.time}</span>}
            {selectedFlightData.airport && <span>📍 {selectedFlightData.airport}</span>}
            {selectedFlightData.terminal && <span>Terminal {selectedFlightData.terminal}</span>}
            <span>{selectedFlightData.passengerCount} passengers</span>
          </div>
        </div>

        {!isSuperAdmin && (
          <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
            🔒 View Only
          </div>
        )}

        {/* Passengers grouped by Group → Hotel */}
        {groupedTravelers.map(({ groupName, count, hotels }) => (
          <div key={groupName} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.25rem' }}>
              {groupName} <span style={{ fontWeight: 400, color: '#666', fontSize: '0.85rem' }}>({count} pax)</span>
            </h2>

            {hotels.map(([hotelName, travelers]) => (
              <div key={hotelName} style={{ marginLeft: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 500, color: '#444', marginBottom: '0.25rem' }}>
                  🏨 {hotelName} <span style={{ color: '#999', fontSize: '0.8rem' }}>({travelers.length} pax)</span>
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '0.3rem 0.5rem' }}>Name</th>
                      <th style={{ padding: '0.3rem 0.5rem' }}>Booking ID</th>
                      <th style={{ padding: '0.3rem 0.5rem' }}>Check-in</th>
                      <th style={{ padding: '0.3rem 0.5rem' }}>Pax Type</th>
                      {isSuperAdmin && <th style={{ padding: '0.3rem 0.5rem' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {travelers.map((t) => (
                      <tr key={t.traveler_id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '0.3rem 0.5rem' }}>{t.first_name} {t.last_name}</td>
                        <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{t.booking_id || '—'}</td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 500,
                            background: t.checkin_status === 'checked_in' ? '#e8f5e9' : t.checkin_status === 'no_show' ? '#ffebee' : '#fff3e0',
                            color: t.checkin_status === 'checked_in' ? '#2e7d32' : t.checkin_status === 'no_show' ? '#c62828' : '#e65100',
                          }}>
                            {t.checkin_status}
                          </span>
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem' }}>{t.pax_type}</td>
                        {isSuperAdmin && (
                          <td style={{ padding: '0.3rem 0.5rem' }}>
                            <button style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}>
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // --- Level 1: Flight List ---
  return (
    <div data-testid="ops-flights-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Flight Details</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Arrival and departure flight information for all travelers.
      </p>

      {!isSuperAdmin && (
        <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
          🔒 View Only
        </div>
      )}

      {/* Direction tabs */}
      <div style={{ borderBottom: '1px solid #e0e0e0', marginBottom: '1rem' }}>
        <button style={tabStyle(direction === 'arrivals')} onClick={() => { setDirection('arrivals'); setSelectedFlight(null); }}>✈️ Arrivals</button>
        <button style={tabStyle(direction === 'departures')} onClick={() => { setDirection('departures'); setSelectedFlight(null); }}>🛫 Departures</button>
      </div>

      {loading && <div style={{ color: '#666' }}>Loading…</div>}

      {!loading && flightCards.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No flight data found.</div>
      )}

      {flightCards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {flightCards.map((fc) => (
            <div
              key={fc.key}
              data-testid={`flight-card-${fc.key}`}
              onClick={() => setSelectedFlight(fc.key)}
              style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', background: '#fff', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{fc.airline} {fc.flight_number}</span>
                  {fc.time && <span style={{ marginLeft: '1rem', color: '#1976d2', fontWeight: 500 }}>{fc.time}</span>}
                  {fc.terminal && <span style={{ marginLeft: '0.75rem', color: '#666', fontSize: '0.85rem' }}>Terminal {fc.terminal}</span>}
                </div>
                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>{fc.passengerCount} pax</span>
              </div>
              {fc.airport && (
                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>📍 {fc.airport}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OpsFlights;
