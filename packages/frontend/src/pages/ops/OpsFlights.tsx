import { useEffect, useMemo, useState } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';

interface FlightGroup {
  key: string;
  airline: string;
  flight_number: string;
  time: string;
  terminal: string;
  travelers: Array<{ traveler_id: string; first_name: string; last_name: string }>;
}

export function OpsFlights() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const data = useOpsPanelStore((s) => s.data);
  const loading = useOpsPanelStore((s) => s.loading);
  const fetchData = useOpsPanelStore((s) => s.fetchData);
  const [direction, setDirection] = useState<'arrivals' | 'departures'>('arrivals');

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  const flightGroups = useMemo(() => {
    const map = new Map<string, FlightGroup>();
    for (const row of data) {
      const flight = direction === 'arrivals' ? row.arrival_flight : row.departure_flight;
      if (!flight?.flight_number) continue;
      const key = `${flight.airline ?? ''}-${flight.flight_number}-${flight.time ?? ''}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          airline: flight.airline ?? '',
          flight_number: flight.flight_number,
          time: flight.time ?? '',
          terminal: flight.terminal ?? '',
          travelers: [],
        });
      }
      map.get(key)!.travelers.push({
        traveler_id: row.traveler_id,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
      });
    }
    return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [data, direction]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', border: 'none', borderBottom: active ? '2px solid #1976d2' : '2px solid transparent',
    background: 'none', fontWeight: active ? 600 : 400, color: active ? '#1976d2' : '#666',
    cursor: 'pointer', fontSize: '0.9rem',
  });

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
        <button style={tabStyle(direction === 'arrivals')} onClick={() => setDirection('arrivals')}>✈️ Arrivals</button>
        <button style={tabStyle(direction === 'departures')} onClick={() => setDirection('departures')}>🛫 Departures</button>
      </div>

      {loading && <div style={{ color: '#666' }}>Loading…</div>}

      {!loading && flightGroups.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No flight data found.</div>
      )}

      {flightGroups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {flightGroups.map((fg) => (
            <div key={fg.key} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{fg.airline} {fg.flight_number}</span>
                  {fg.time && <span style={{ marginLeft: '1rem', color: '#1976d2', fontWeight: 500 }}>{fg.time}</span>}
                  {fg.terminal && <span style={{ marginLeft: '0.75rem', color: '#666', fontSize: '0.85rem' }}>Terminal {fg.terminal}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{fg.travelers.length} pax</span>
                  {isSuperAdmin && (
                    <button style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#444' }}>
                {fg.travelers.map((t, i) => (
                  <span key={t.traveler_id}>
                    {t.first_name} {t.last_name}{i < fg.travelers.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OpsFlights;
