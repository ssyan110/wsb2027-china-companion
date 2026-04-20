import { useEffect, useMemo, useState, useCallback } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../lib/api';
import type { ExtendedMasterListRow } from '@wsb/shared';

interface HotelSummary {
  name: string;
  totalTravelers: number;
  roomCount: number;
  singles: number;
  doubles: number;
  twins: number;
  triples: number;
  checkedIn: number;
}

interface HotelFormData {
  name: string;
  short_code: string;
  address_en: string;
  address_cn: string;
}

const EMPTY_HOTEL_FORM: HotelFormData = { name: '', short_code: '', address_en: '', address_cn: '' };

const ROOM_SEQ_COLORS = [
  '#e3f2fd', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5',
  '#e0f7fa', '#fff9c4', '#fbe9e7', '#ede7f6', '#e0f2f1',
];

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

// ─── Hotel Modal ─────────────────────────────────────────────
function HotelModal({
  title, initial, onClose, onSave, saving,
}: {
  title: string;
  initial: HotelFormData;
  onClose: () => void;
  onSave: (data: HotelFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<HotelFormData>(initial);
  const set = (k: keyof HotelFormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div style={modalOverlay} onClick={onClose} data-testid="hotel-modal-overlay">
      <div style={modalBox} onClick={(e) => e.stopPropagation()} data-testid="hotel-modal">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem' }}>
            Name
            <input data-testid="hotel-name-input" style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Short Code
            <input data-testid="hotel-code-input" style={inputStyle} value={form.short_code} onChange={(e) => set('short_code', e.target.value)} />
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Address (EN)
            <input data-testid="hotel-address-en-input" style={inputStyle} value={form.address_en} onChange={(e) => set('address_en', e.target.value)} />
          </label>
          <label style={{ fontSize: '0.85rem' }}>
            Address (CN)
            <input data-testid="hotel-address-cn-input" style={inputStyle} value={form.address_cn} onChange={(e) => set('address_cn', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button style={btnSecondary} onClick={onClose} data-testid="hotel-modal-cancel">Cancel</button>
          <button
            style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
            disabled={saving || !form.name.trim()}
            onClick={() => onSave(form)}
            data-testid="hotel-modal-save"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function OpsRooms() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';
  const data = useOpsPanelStore((s) => s.data);
  const loading = useOpsPanelStore((s) => s.loading);
  const fetchData = useOpsPanelStore((s) => s.fetchData);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);

  // Filter state (local)
  const [filterHotel, setFilterHotel] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterOccupancy, setFilterOccupancy] = useState('');
  const [filterCheckin, setFilterCheckin] = useState('');

  // Modal state
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [editHotelName, setEditHotelName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  // Unique values for filter dropdowns
  const allHotelNames = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) {
      if (row.room_assignment?.hotel_name) s.add(row.room_assignment.hotel_name);
      row.hotels?.forEach((h) => s.add(h));
    }
    return Array.from(s).sort();
  }, [data]);

  const allGroups = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) row.groups?.forEach((g) => s.add(g));
    return Array.from(s).sort();
  }, [data]);

  // ─── Hotel summaries (Level 1) ─────────────────────────────
  const hotelSummaries = useMemo(() => {
    const map = new Map<string, {
      travelers: Set<string>; rooms: Set<string>;
      singles: number; doubles: number; twins: number; triples: number; checkedIn: number;
    }>();

    for (const row of data) {
      const hotelName = row.room_assignment?.hotel_name;
      const hotelNames: string[] = hotelName ? [hotelName] : (row.hotels?.length ? row.hotels : []);

      for (const name of hotelNames) {
        if (!map.has(name)) {
          map.set(name, { travelers: new Set(), rooms: new Set(), singles: 0, doubles: 0, twins: 0, triples: 0, checkedIn: 0 });
        }
        const entry = map.get(name)!;
        entry.travelers.add(row.traveler_id);
        if (row.checkin_status === 'checked_in') entry.checkedIn++;

        if (row.room_assignment?.hotel_name === name && row.room_assignment.room_number) {
          entry.rooms.add(row.room_assignment.room_number);
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
        singles: entry.singles, doubles: entry.doubles,
        twins: entry.twins, triples: entry.triples,
        checkedIn: entry.checkedIn,
      });
    }
    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Level 1 totals
  const totalTravelers = useMemo(() => hotelSummaries.reduce((s, h) => s + h.totalTravelers, 0), [hotelSummaries]);
  const totalRooms = useMemo(() => hotelSummaries.reduce((s, h) => s + h.roomCount, 0), [hotelSummaries]);

  // ─── Level 2: hotel travelers ──────────────────────────────
  const hotelTravelers = useMemo(() => {
    if (!selectedHotel) return [];
    return data.filter((row) => {
      if (row.room_assignment?.hotel_name === selectedHotel) return true;
      if (row.hotels?.includes(selectedHotel)) return true;
      return false;
    });
  }, [data, selectedHotel]);

  // Apply Level 2 filters
  const filteredHotelTravelers = useMemo(() => {
    let result = hotelTravelers;
    if (filterGroup) result = result.filter((r) => r.groups?.includes(filterGroup));
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      result = result.filter((r) =>
        `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().includes(q) ||
        (r.booking_id ?? '').toLowerCase().includes(q)
      );
    }
    if (filterOccupancy) result = result.filter((r) => r.room_assignment?.occupancy === filterOccupancy);
    if (filterCheckin) result = result.filter((r) => (r.checkin_status ?? 'pending') === filterCheckin);
    return result;
  }, [hotelTravelers, filterGroup, filterSearch, filterOccupancy, filterCheckin]);

  // Color map & sorting for Level 2
  const seqColorMap = useMemo(() => {
    const map = new Map<number, string>();
    let colorIdx = 0;
    for (const row of filteredHotelTravelers) {
      const seq = row.room_assignment?.room_assignment_seq;
      if (seq != null && !map.has(seq)) {
        map.set(seq, ROOM_SEQ_COLORS[colorIdx % ROOM_SEQ_COLORS.length]);
        colorIdx++;
      }
    }
    return map;
  }, [filteredHotelTravelers]);

  const roomTypes = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredHotelTravelers) {
      const rt = row.room_assignment?.paid_room_type;
      if (rt) map.set(rt, (map.get(rt) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredHotelTravelers]);

  const sortedTravelers = useMemo(() => {
    return [...filteredHotelTravelers].sort((a, b) => {
      const seqA = a.room_assignment?.room_assignment_seq ?? 99999;
      const seqB = b.room_assignment?.room_assignment_seq ?? 99999;
      if (seqA !== seqB) return seqA - seqB;
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    });
  }, [filteredHotelTravelers]);

  // Check-in stats for Level 2
  const l2CheckedIn = useMemo(() => filteredHotelTravelers.filter((r) => r.checkin_status === 'checked_in').length, [filteredHotelTravelers]);
  const l2Total = filteredHotelTravelers.length;

  // ─── Modal handlers ────────────────────────────────────────
  const handleAddHotel = useCallback(async (form: HotelFormData) => {
    setSaving(true);
    try {
      await apiClient('/api/v1/admin/hotels', { method: 'POST', body: JSON.stringify(form) });
      setShowAddHotel(false);
      fetchData();
    } catch { /* toast / ignore */ }
    setSaving(false);
  }, [fetchData]);

  const handleEditHotel = useCallback(async (form: HotelFormData) => {
    setSaving(true);
    try {
      // Use existing PATCH endpoint pattern
      await apiClient('/api/v1/admin/hotels', { method: 'PATCH', body: JSON.stringify(form) });
      setEditHotelName(null);
      fetchData();
    } catch { /* toast / ignore */ }
    setSaving(false);
  }, [fetchData]);

  const clearFilters = () => {
    setFilterGroup(''); setFilterSearch(''); setFilterOccupancy(''); setFilterCheckin('');
  };

  // ─── RENDER: Level 2 (Hotel Detail) ────────────────────────
  if (selectedHotel) {
    return (
      <div data-testid="ops-rooms-page" style={{ padding: '1.5rem' }}>
        <button
          data-testid="back-to-hotels"
          onClick={() => { setSelectedHotel(null); clearFilters(); }}
          style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 }}
        >
          ← Back to Hotels
        </button>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedHotel}</h1>
        <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
          {l2Total} travelers · {l2CheckedIn}/{l2Total} checked in
        </p>

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
        <div style={filterBarStyle} data-testid="hotel-detail-filters">
          <input
            data-testid="hotel-detail-search"
            style={searchStyle}
            placeholder="Search travelers…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          <select data-testid="hotel-detail-group-filter" style={selectStyle} value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
            <option value="">All Groups</option>
            {allGroups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select data-testid="hotel-detail-occupancy-filter" style={selectStyle} value={filterOccupancy} onChange={(e) => setFilterOccupancy(e.target.value)}>
            <option value="">All Occupancy</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="twin">Twin</option>
            <option value="triple">Triple</option>
          </select>
          <select data-testid="hotel-detail-checkin-filter" style={selectStyle} value={filterCheckin} onChange={(e) => setFilterCheckin(e.target.value)}>
            <option value="">All Check-in</option>
            <option value="pending">Pending</option>
            <option value="checked_in">Checked In</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

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
          {sortedTravelers.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No travelers match the current filters.</div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Level 1 (Hotel List) ──────────────────────────
  return (
    <div data-testid="ops-rooms-page" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Hotels</h1>
        {isSuperAdmin && (
          <button
            data-testid="add-hotel-btn"
            style={btnPrimary}
            onClick={() => setShowAddHotel(true)}
          >
            + Add Hotel
          </button>
        )}
      </div>

      {/* Summary bar */}
      {hotelSummaries.length > 0 && (
        <div data-testid="hotel-summary-bar" style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
          {hotelSummaries.length} hotels · {totalTravelers} travelers · {totalRooms} rooms
        </div>
      )}

      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Hotel overview with room assignments and traveler counts.
      </p>

      {!isSuperAdmin && (
        <div style={{ padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100', borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
          🔒 View Only
        </div>
      )}

      {/* Level 1 filter: hotel filter */}
      <div style={filterBarStyle} data-testid="hotel-list-filters">
        <select data-testid="hotel-list-hotel-filter" style={selectStyle} value={filterHotel} onChange={(e) => setFilterHotel(e.target.value)}>
          <option value="">All Hotels</option>
          {allHotelNames.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      {loading && <div style={{ color: '#666' }}>Loading…</div>}

      {!loading && hotelSummaries.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No hotel data found.</div>
      )}

      {hotelSummaries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {hotelSummaries
            .filter((h) => !filterHotel || h.name === filterHotel)
            .map((hotel) => {
              const pct = hotel.totalTravelers ? (hotel.checkedIn / hotel.totalTravelers) * 100 : 0;
              return (
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
                        data-testid={`edit-hotel-${hotel.name}`}
                        onClick={(e) => { e.stopPropagation(); setEditHotelName(hotel.name); }}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1px solid #1976d2', borderRadius: 4, background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.25rem' }}>
                    {hotel.totalTravelers} travelers · {hotel.roomCount} rooms
                  </div>
                  {/* Check-in progress */}
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                    {hotel.checkedIn}/{hotel.totalTravelers} checked in
                  </div>
                  <div style={progressBarOuter}>
                    <div style={{ height: '100%', background: '#4caf50', borderRadius: 3, width: `${pct}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {hotel.singles > 0 && <span>Singles: {hotel.singles}</span>}
                    {hotel.doubles > 0 && <span>Doubles: {hotel.doubles}</span>}
                    {hotel.twins > 0 && <span>Twins: {hotel.twins}</span>}
                    {hotel.triples > 0 && <span>Triples: {hotel.triples}</span>}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Add Hotel Modal */}
      {showAddHotel && (
        <HotelModal
          title="Add Hotel"
          initial={EMPTY_HOTEL_FORM}
          onClose={() => setShowAddHotel(false)}
          onSave={handleAddHotel}
          saving={saving}
        />
      )}

      {/* Edit Hotel Modal */}
      {editHotelName && (
        <HotelModal
          title={`Edit Hotel — ${editHotelName}`}
          initial={{ name: editHotelName, short_code: '', address_en: '', address_cn: '' }}
          onClose={() => setEditHotelName(null)}
          onSave={handleEditHotel}
          saving={saving}
        />
      )}
    </div>
  );
}

export default OpsRooms;
