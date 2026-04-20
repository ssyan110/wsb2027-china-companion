import { useEffect, useMemo, useState, useCallback } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../lib/api';
import type { ExtendedMasterListRow } from '@wsb/shared';

interface FlightCard {
  key: string;
  airline: string;
  flight_number: string;
  time: string;
  airport: string;
  terminal: string;
  passengerCount: number;
  checkedIn: number;
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

interface FlightFormData {
  airline: string;
  flight_number: string;
  direction: 'arrival' | 'departure';
  time: string;
  airport: string;
  terminal: string;
}

const EMPTY_FLIGHT_FORM: FlightFormData = {
  airline: '', flight_number: '', direction: 'arrival', time: '', airport: '', terminal: '',
};

// ─── Shared styles ───────────────────────────────────────────
const filterBarStyle: React.CSSProperties = {
  display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
  marginBottom: '1rem', padding: '0.75rem', background: '#fafafa',
  borderRadius: 8, border: '1px solid #eee',
};
const selectStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem', borderRadius: 4, border: '1px solid #ccc',
  fontSize: '0.8rem', background: '#fff',
};
const searchStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem', borderRadius: 4, border: '1px solid #ccc',
  fontSize: '0.8rem', minWidth: 160,
};
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalBox: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: '1.5rem', width: '100%',
  maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.4rem 0.5rem', borderRadius: 4,
  border: '1px solid #ccc', fontSize: '0.85rem', boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  padding: '0.4rem 1rem', borderRadius: 4, border: 'none',
  background: '#1976d2', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
};
const btnSecondary: React.CSSProperties = {
  padding: '0.4rem 1rem', borderRadius: 4, border: '1px solid #ccc',
  background: '#fff', cursor: 'pointer', fontSize: '0.85rem',
};
const progressBarOuter: React.CSSProperties = {
  height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginTop: '0.35rem',
};

// ─── Flight Modal ────────────────────────────────────────────
function FlightModal({
  title, initial, onClose, onSave, saving,
}: {
  title: string;
  initial: FlightFormData;
  onClose: () => void;
  onSave: (data: FlightFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FlightFormData>(initial);
  const set = (k: keyof FlightFormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div style={modalOverlay} onClick={onClose} data-testid="flight-modal-overlay">
      <div style={modalBox} onClick={(e) => e.stopPropagation()} data-testid="flight-modal">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem' }}>
            Airline
            <input data-testid="flight-airline-input" style={inputStyle} value={form.airline} onChange={(e) => set('airline', e.target.value)} />
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Flight Number
            <input data-testid="flight-number-input" style={inputStyle} value={form.flight_number} onChange={(e) => set('flight_number', e.target.value)} />
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Direction
            <select data-testid="flight-direction-input" style={{ ...inputStyle, background: '#fff' }} value={form.direction} onChange={(e) => set('direction', e.target.value)}>
              <option value="arrival">Arrival</option>
              <option value="departure">Departure</option>
            </select>
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Time
            <input data-testid="flight-time-input" style={inputStyle} value={form.time} onChange={(e) => set('time', e.target.value)} placeholder="e.g. 14:30" />
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Airport
            <input data-testid="flight-airport-input" style={inputStyle} value={form.airport} onChange={(e) => set('airport', e.target.value)} />
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Terminal
            <input data-testid="flight-terminal-input" style={inputStyle} value={form.terminal} onChange={(e) => set('terminal', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button style={btnSecondary} onClick={onClose} data-testid="flight-modal-cancel">Cancel</button>
          <button
            style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
            disabled={saving || !form.flight_number.trim()}
            onClick={() => onSave(form)}
            data-testid="flight-modal-save"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function OpsFlights() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const data = useOpsPanelStore((s) => s.data);
  const loading = useOpsPanelStore((s) => s.loading);
  const fetchData = useOpsPanelStore((s) => s.fetchData);
  const [direction, setDirection] = useState<'arrivals' | 'departures'>('arrivals');
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);

  // Filter state (local)
  const [filterAirline, setFilterAirline] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterHotel, setFilterHotel] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCheckin, setFilterCheckin] = useState('');

  // Modal state
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [editFlightKey, setEditFlightKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  // Unique values for filter dropdowns
  const allAirlines = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) {
      const f = direction === 'arrivals' ? row.arrival_flight : row.departure_flight;
      if (f?.airline) s.add(f.airline);
    }
    return Array.from(s).sort();
  }, [data, direction]);

  const allGroups = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) row.groups?.forEach((g) => s.add(g));
    return Array.from(s).sort();
  }, [data]);

  const allHotels = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) {
      if (row.room_assignment?.hotel_name) s.add(row.room_assignment.hotel_name);
      row.hotels?.forEach((h) => s.add(h));
    }
    return Array.from(s).sort();
  }, [data]);

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
          checkedIn: 0,
          travelers: [],
        });
      }
      const entry = map.get(key)!;
      entry.passengerCount++;
      if (row.checkin_status === 'checked_in') entry.checkedIn++;
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

  // Apply Level 1 filters to flight cards
  const filteredFlightCards = useMemo(() => {
    let cards = flightCards;
    if (filterAirline) cards = cards.filter((c) => c.airline === filterAirline);
    // For group/hotel/search/checkin filters at L1, filter the travelers inside each card
    // and hide cards with 0 matching travelers
    if (filterGroup || filterHotel || filterSearch || filterCheckin) {
      cards = cards.map((c) => {
        let travelers = c.travelers;
        if (filterGroup) travelers = travelers.filter((t) => t.groups.includes(filterGroup));
        if (filterHotel) travelers = travelers.filter((t) => t.hotels.includes(filterHotel));
        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          travelers = travelers.filter((t) =>
            `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
            t.booking_id.toLowerCase().includes(q)
          );
        }
        if (filterCheckin) travelers = travelers.filter((t) => t.checkin_status === filterCheckin);
        const checkedIn = travelers.filter((t) => t.checkin_status === 'checked_in').length;
        return { ...c, travelers, passengerCount: travelers.length, checkedIn };
      }).filter((c) => c.passengerCount > 0);
    }
    return cards;
  }, [flightCards, filterAirline, filterGroup, filterHotel, filterSearch, filterCheckin]);

  // Total summary
  const totalPassengers = useMemo(() => filteredFlightCards.reduce((s, c) => s + c.passengerCount, 0), [filteredFlightCards]);

  // Get selected flight data (from filtered set)
  const selectedFlightData = useMemo(() => {
    if (!selectedFlight) return null;
    return filteredFlightCards.find((f) => f.key === selectedFlight) ?? null;
  }, [filteredFlightCards, selectedFlight]);

  // Apply Level 2 filters to selected flight travelers
  const filteredL2Travelers = useMemo(() => {
    if (!selectedFlightData) return [];
    let travelers = selectedFlightData.travelers;
    if (filterGroup) travelers = travelers.filter((t) => t.groups.includes(filterGroup));
    if (filterHotel) travelers = travelers.filter((t) => t.hotels.includes(filterHotel));
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      travelers = travelers.filter((t) =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
        t.booking_id.toLowerCase().includes(q)
      );
    }
    if (filterCheckin) travelers = travelers.filter((t) => t.checkin_status === filterCheckin);
    return travelers;
  }, [selectedFlightData, filterGroup, filterHotel, filterSearch, filterCheckin]);

  // Group travelers by group, then by hotel (Level 2)
  const groupedTravelers = useMemo(() => {
    const groupMap = new Map<string, FlightTraveler[]>();

    for (const t of filteredL2Travelers) {
      const groupNames = t.groups.length > 0 ? t.groups : ['Unassigned'];
      for (const g of groupNames) {
        if (!groupMap.has(g)) groupMap.set(g, []);
        groupMap.get(g)!.push(t);
      }
    }

    const entries = Array.from(groupMap.entries()).sort((a, b) => {
      if (a[0] === 'Unassigned') return 1;
      if (b[0] === 'Unassigned') return -1;
      return a[0].localeCompare(b[0]);
    });

    return entries.map(([groupName, travelers]) => {
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
  }, [filteredL2Travelers]);

  // L2 check-in stats
  const l2CheckedIn = useMemo(() => filteredL2Travelers.filter((t) => t.checkin_status === 'checked_in').length, [filteredL2Travelers]);
  const l2Total = filteredL2Travelers.length;

  // ─── Modal handlers ────────────────────────────────────────
  const handleAddFlight = useCallback(async (form: FlightFormData) => {
    setSaving(true);
    try {
      await apiClient('/api/v1/admin/flights', { method: 'POST', body: JSON.stringify(form) });
      setShowAddFlight(false);
      fetchData();
    } catch { /* toast / ignore */ }
    setSaving(false);
  }, [fetchData]);

  const handleEditFlight = useCallback(async (form: FlightFormData) => {
    setSaving(true);
    try {
      await apiClient('/api/v1/admin/flights', { method: 'PATCH', body: JSON.stringify(form) });
      setEditFlightKey(null);
      fetchData();
    } catch { /* toast / ignore */ }
    setSaving(false);
  }, [fetchData]);

  const clearFilters = () => {
    setFilterAirline(''); setFilterGroup(''); setFilterHotel('');
    setFilterSearch(''); setFilterCheckin('');
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', border: 'none', borderBottom: active ? '2px solid #1976d2' : '2px solid transparent',
    background: 'none', fontWeight: active ? 600 : 400, color: active ? '#1976d2' : '#666',
    cursor: 'pointer', fontSize: '0.9rem',
  });

  // ─── RENDER: Level 2 (Flight Detail) ───────────────────────
  if (selectedFlight && selectedFlightData) {
    return (
      <div data-testid="ops-flights-page" style={{ padding: '1.5rem' }}>
        <button
          data-testid="back-to-flights"
          onClick={() => { setSelectedFlight(null); clearFilters(); }}
          style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 }}
        >
          ← Back to Flights
        </button>

        {/* Flight info header */}
        <div style={{ marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {selectedFlightData.airline} {selectedFlightData.flight_number}
          </h1>
          <div style={{ fontSize: '0.9rem', color: '#666', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {selectedFlightData.time && <span>🕐 {selectedFlightData.time}</span>}
            {selectedFlightData.airport && <span>📍 {selectedFlightData.airport}</span>}
            {selectedFlightData.terminal && <span>Terminal {selectedFlightData.terminal}</span>}
            <span>{l2Total} passengers · {l2CheckedIn}/{l2Total} checked in</span>
          </div>
        </div>

        {/* Check-in progress bar */}
        <div style={{ ...progressBarOuter, marginBottom: '1rem', maxWidth: 300 }}>
          <div style={{ height: '100%', background: '#4caf50', borderRadius: 3, width: l2Total ? `${(l2CheckedIn / l2Total) * 100}%` : '0%', transition: 'width 0.3s' }} />
        </div>

        {!isSuperAdmin && (
          <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
            🔒 View Only
          </div>
        )}

        {/* Filter bar */}
        <div style={filterBarStyle} data-testid="flight-detail-filters">
          <input
            data-testid="flight-detail-search"
            style={searchStyle}
            placeholder="Search passengers…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          <select data-testid="flight-detail-group-filter" style={selectStyle} value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
            <option value="">All Groups</option>
            {allGroups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select data-testid="flight-detail-hotel-filter" style={selectStyle} value={filterHotel} onChange={(e) => setFilterHotel(e.target.value)}>
            <option value="">All Hotels</option>
            {allHotels.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select data-testid="flight-detail-checkin-filter" style={selectStyle} value={filterCheckin} onChange={(e) => setFilterCheckin(e.target.value)}>
            <option value="">All Check-in</option>
            <option value="pending">Pending</option>
            <option value="checked_in">Checked In</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

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

        {filteredL2Travelers.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No passengers match the current filters.</div>
        )}
      </div>
    );
  }

  // ─── RENDER: Level 1 (Flight List) ─────────────────────────
  return (
    <div data-testid="ops-flights-page" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Flight Details</h1>
        {isSuperAdmin && (
          <button
            data-testid="add-flight-btn"
            style={btnPrimary}
            onClick={() => setShowAddFlight(true)}
          >
            + Add Flight
          </button>
        )}
      </div>

      {/* Summary bar */}
      {filteredFlightCards.length > 0 && (
        <div data-testid="flight-summary-bar" style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
          {filteredFlightCards.length} flights · {totalPassengers} passengers
        </div>
      )}

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
        <button style={tabStyle(direction === 'arrivals')} onClick={() => { setDirection('arrivals'); setSelectedFlight(null); clearFilters(); }}>✈️ Arrivals</button>
        <button style={tabStyle(direction === 'departures')} onClick={() => { setDirection('departures'); setSelectedFlight(null); clearFilters(); }}>🛫 Departures</button>
      </div>

      {/* Filter bar */}
      <div style={filterBarStyle} data-testid="flight-list-filters">
        <input
          data-testid="flight-list-search"
          style={searchStyle}
          placeholder="Search passengers…"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
        />
        <select data-testid="flight-list-airline-filter" style={selectStyle} value={filterAirline} onChange={(e) => setFilterAirline(e.target.value)}>
          <option value="">All Airlines</option>
          {allAirlines.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select data-testid="flight-list-group-filter" style={selectStyle} value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
          <option value="">All Groups</option>
          {allGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select data-testid="flight-list-hotel-filter" style={selectStyle} value={filterHotel} onChange={(e) => setFilterHotel(e.target.value)}>
          <option value="">All Hotels</option>
          {allHotels.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select data-testid="flight-list-checkin-filter" style={selectStyle} value={filterCheckin} onChange={(e) => setFilterCheckin(e.target.value)}>
          <option value="">All Check-in</option>
          <option value="pending">Pending</option>
          <option value="checked_in">Checked In</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {loading && <div style={{ color: '#666' }}>Loading…</div>}

      {!loading && filteredFlightCards.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No flight data found.</div>
      )}

      {filteredFlightCards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredFlightCards.map((fc) => {
            const pct = fc.passengerCount ? (fc.checkedIn / fc.passengerCount) * 100 : 0;
            return (
              <div
                key={fc.key}
                data-testid={`flight-card-${fc.key}`}
                onClick={() => setSelectedFlight(fc.key)}
                style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', background: '#fff', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{fc.airline} {fc.flight_number}</span>
                    {fc.time && <span style={{ color: '#1976d2', fontWeight: 500 }}>{fc.time}</span>}
                    {fc.terminal && <span style={{ color: '#666', fontSize: '0.85rem' }}>Terminal {fc.terminal}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>{fc.passengerCount} pax</span>
                    {isSuperAdmin && (
                      <button
                        data-testid={`edit-flight-${fc.key}`}
                        onClick={(e) => { e.stopPropagation(); setEditFlightKey(fc.key); }}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {fc.airport && (
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>📍 {fc.airport}</div>
                )}
                {/* Check-in progress */}
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  {fc.checkedIn}/{fc.passengerCount} checked in
                </div>
                <div style={progressBarOuter}>
                  <div style={{ height: '100%', background: '#4caf50', borderRadius: 3, width: `${pct}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Flight Modal */}
      {showAddFlight && (
        <FlightModal
          title="Add Flight"
          initial={EMPTY_FLIGHT_FORM}
          onClose={() => setShowAddFlight(false)}
          onSave={handleAddFlight}
          saving={saving}
        />
      )}

      {/* Edit Flight Modal */}
      {editFlightKey && (() => {
        const fc = flightCards.find((c) => c.key === editFlightKey);
        return fc ? (
          <FlightModal
            title={`Edit Flight — ${fc.airline} ${fc.flight_number}`}
            initial={{
              airline: fc.airline,
              flight_number: fc.flight_number,
              direction: direction === 'arrivals' ? 'arrival' : 'departure',
              time: fc.time,
              airport: fc.airport,
              terminal: fc.terminal,
            }}
            onClose={() => setEditFlightKey(null)}
            onSave={handleEditFlight}
            saving={saving}
          />
        ) : null;
      })()}
    </div>
  );
}

export default OpsFlights;
