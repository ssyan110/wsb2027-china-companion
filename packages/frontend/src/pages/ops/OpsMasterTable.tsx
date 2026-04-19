import { Fragment, useEffect, useCallback, useRef, useState } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../lib/api';
import type { ExtendedMasterListRow, EventAttendanceItem } from '@wsb/shared';
import { ConnectedFilterBar } from '../../components/ops/FilterBar';
import { InlineEditor, getFieldType } from '../../components/ops/InlineEditor';
import { CheckinManager } from '../../components/ops/CheckinManager';

// ─── Column definitions ──────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
  editable: boolean;
  sticky?: boolean;
  group?: 'room' | 'arrival' | 'departure' | 'event';
}

const COLUMNS: ColumnDef[] = [
  { key: 'first_name', label: 'First', sortable: true, editable: true, sticky: true },
  { key: 'last_name', label: 'Last', sortable: true, editable: true },
  { key: 'full_name_raw', label: 'Full Name', sortable: false, editable: false },
  { key: 'gender', label: 'Gender', sortable: false, editable: true },
  { key: 'age', label: 'Age', sortable: true, editable: true },
  { key: 'invitee_type', label: 'Invitee Type', sortable: true, editable: true },
  { key: 'registration_type', label: 'Reg. Type', sortable: false, editable: true },
  { key: 'pax_type', label: 'Pax Type', sortable: true, editable: true },
  { key: 'vip_tag', label: 'VIP', sortable: true, editable: true },
  { key: 'internal_id', label: 'Internal ID', sortable: true, editable: true },
  { key: 'agent_code', label: 'Agent Code', sortable: true, editable: true },
  { key: 'booking_id', label: 'Booking ID', sortable: false, editable: false },
  { key: 'email_primary', label: 'Email', sortable: false, editable: false },
  { key: 'phone', label: 'Phone', sortable: false, editable: false },
  { key: 'passport_name', label: 'Passport Name', sortable: false, editable: false },
  { key: 'party_total', label: 'Party Total', sortable: false, editable: true },
  { key: 'party_adults', label: 'Party Adults', sortable: false, editable: true },
  { key: 'party_children', label: 'Party Children', sortable: false, editable: true },
  { key: 'dietary_vegan', label: 'Vegan', sortable: false, editable: true },
  { key: 'dietary_notes', label: 'Dietary Notes', sortable: false, editable: true },
  { key: 'remarks', label: 'Remarks', sortable: false, editable: true },
  { key: 'repeat_attendee', label: 'Repeat', sortable: false, editable: false },
  { key: 'jba_repeat', label: 'JBA Repeat', sortable: false, editable: true },
  { key: 'checkin_status', label: 'Check-in', sortable: true, editable: false },
  { key: 'onsite_flight_change', label: 'Flight Change', sortable: false, editable: true },
  { key: 'smd_name', label: 'SMD Name', sortable: false, editable: true },
  { key: 'ceo_name', label: 'CEO Name', sortable: false, editable: true },
  { key: 'room_number', label: 'Room #', sortable: false, editable: false, group: 'room' },
  { key: 'occupancy', label: 'Occupancy', sortable: false, editable: false, group: 'room' },
  { key: 'paid_room_type', label: 'Room Type', sortable: false, editable: false, group: 'room' },
  { key: 'hotel_confirmation_no', label: 'Hotel Conf.', sortable: false, editable: false, group: 'room' },
  { key: 'preferred_roommates', label: 'Roommates', sortable: false, editable: false, group: 'room' },
  { key: 'arr_airline', label: 'Arr. Airline', sortable: false, editable: false, group: 'arrival' },
  { key: 'arr_flight', label: 'Arr. Flight', sortable: false, editable: false, group: 'arrival' },
  { key: 'arr_time', label: 'Arr. Time', sortable: false, editable: false, group: 'arrival' },
  { key: 'arr_terminal', label: 'Arr. Terminal', sortable: false, editable: false, group: 'arrival' },
  { key: 'dep_airline', label: 'Dep. Airline', sortable: false, editable: false, group: 'departure' },
  { key: 'dep_flight', label: 'Dep. Flight', sortable: false, editable: false, group: 'departure' },
  { key: 'dep_time', label: 'Dep. Time', sortable: false, editable: false, group: 'departure' },
  { key: 'dep_terminal', label: 'Dep. Terminal', sortable: false, editable: false, group: 'departure' },
  { key: 'event_attendance', label: 'Events', sortable: false, editable: false, group: 'event' },
];

// ─── Enum options for InlineEditor selects ───────────────────

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'undisclosed', label: 'Undisclosed' },
];

const INVITEE_TYPE_OPTIONS = [
  { value: 'invitee', label: 'Invitee' },
  { value: 'guest', label: 'Guest' },
];

const PAX_TYPE_OPTIONS = [
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
  { value: 'infant', label: 'Infant' },
];

const CHECKIN_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'no_show', label: 'No Show' },
];

function getOptionsForField(field: string) {
  switch (field) {
    case 'gender': return GENDER_OPTIONS;
    case 'invitee_type': return INVITEE_TYPE_OPTIONS;
    case 'pax_type': return PAX_TYPE_OPTIONS;
    case 'checkin_status': return CHECKIN_STATUS_OPTIONS;
    default: return undefined;
  }
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// ─── Room assignment seq color palette ───────────────────────

const SEQ_COLORS = [
  '#e3f2fd', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5',
  '#e0f7fa', '#fff9c4', '#fbe9e7', '#e8eaf6', '#f1f8e9',
];

function seqColor(seq: number | null | undefined): string | undefined {
  if (seq == null) return undefined;
  return SEQ_COLORS[seq % SEQ_COLORS.length];
}

// ─── Sort indicator ──────────────────────────────────────────

function SortIndicator({ column, sortBy, sortOrder }: { column: string; sortBy: string; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== column) return <span className="sort-indicator" style={{ opacity: 0.3, marginLeft: 4 }}>⇅</span>;
  return <span className="sort-indicator" style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
}

// ─── Event attendance detail row ─────────────────────────────

function EventDetailRow({ events, colSpan }: { events: EventAttendanceItem[]; colSpan: number }) {
  return (
    <tr className="event-detail-row" data-testid="event-detail-row">
      <td colSpan={colSpan} style={{ padding: '0.5rem 1rem', background: '#f5f5f5' }}>
        <table style={{ width: '100%', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.2rem 0.5rem' }}>Event</th>
              <th style={{ textAlign: 'left', padding: '0.2rem 0.5rem' }}>Fleet #</th>
              <th style={{ textAlign: 'left', padding: '0.2rem 0.5rem' }}>Attended</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => (
              <tr key={i}>
                <td style={{ padding: '0.2rem 0.5rem' }}>{ev.event_name}</td>
                <td style={{ padding: '0.2rem 0.5rem' }}>{ev.fleet_number ?? '—'}</td>
                <td style={{ padding: '0.2rem 0.5rem' }}>
                  {ev.attended === true ? '✅' : ev.attended === false ? '❌' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

// ─── Cell value extraction ───────────────────────────────────

function getCellValue(row: ExtendedMasterListRow, colKey: string): unknown {
  if (colKey === 'room_number') return row.room_assignment?.room_number ?? '';
  if (colKey === 'occupancy') return row.room_assignment?.occupancy ?? '';
  if (colKey === 'paid_room_type') return row.room_assignment?.paid_room_type ?? '';
  if (colKey === 'hotel_confirmation_no') return row.room_assignment?.hotel_confirmation_no ?? '';
  if (colKey === 'preferred_roommates') return row.room_assignment?.preferred_roommates ?? '';
  if (colKey === 'arr_airline') return row.arrival_flight?.airline ?? '';
  if (colKey === 'arr_flight') return row.arrival_flight?.flight_number ?? '';
  if (colKey === 'arr_time') return row.arrival_flight?.time ?? '';
  if (colKey === 'arr_terminal') return row.arrival_flight?.terminal ?? '';
  if (colKey === 'dep_airline') return row.departure_flight?.airline ?? '';
  if (colKey === 'dep_flight') return row.departure_flight?.flight_number ?? '';
  if (colKey === 'dep_time') return row.departure_flight?.time ?? '';
  if (colKey === 'dep_terminal') return row.departure_flight?.terminal ?? '';
  if (colKey === 'event_attendance') {
    const count = row.event_attendance?.length ?? 0;
    return count > 0 ? `${count} event(s)` : '—';
  }
  return (row as unknown as Record<string, unknown>)[colKey] ?? '';
}

function formatCellDisplay(value: unknown, _colKey: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  return String(value);
}

// ─── SearchBar component ─────────────────────────────────────

function SearchBar() {
  const search = useOpsPanelStore((s) => s.search);
  const setSearch = useOpsPanelStore((s) => s.setSearch);
  const fetchData = useOpsPanelStore((s) => s.fetchData);
  const [localValue, setLocalValue] = useState(search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearch(val);
      fetchData();
    }, 300);
  }, [setSearch, fetchData]);

  useEffect(() => { setLocalValue(search); }, [search]);
  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  return (
    <input
      type="text"
      placeholder="Search name, email, booking, phone, agent code…"
      value={localValue}
      onChange={handleChange}
      aria-label="Search travelers"
      data-testid="search-bar"
      style={{
        padding: '0.4rem 0.75rem',
        fontSize: '0.9rem',
        border: '1px solid #ccc',
        borderRadius: 4,
        width: 340,
      }}
    />
  );
}

// ─── Add Traveler Modal ──────────────────────────────────────

interface AddTravelerFormData {
  first_name: string;
  last_name: string;
  email: string;
  booking_id: string;
  role_type: string;
  gender: string;
  age: string;
  pax_type: string;
  phone: string;
}

function AddTravelerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<AddTravelerFormData>({
    first_name: '', last_name: '', email: '', booking_id: '',
    role_type: 'traveler', gender: '', age: '', pax_type: 'adult', phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        booking_id: form.booking_id || undefined,
        phone: form.phone || undefined,
        gender: form.gender || undefined,
      };
      await apiClient('/api/v1/admin/travelers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add traveler');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', fontSize: '0.9rem', border: '1px solid #ccc', borderRadius: 4 };

  return (
    <div data-testid="add-traveler-modal" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: '1.5rem', width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Add Traveler</h2>
        {error && <div style={{ color: '#d32f2f', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>First Name *</label>
              <input required style={fieldStyle} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Last Name *</label>
              <input required style={fieldStyle} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email *</label>
              <input required type="email" style={fieldStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Booking ID</label>
              <input style={fieldStyle} value={form.booking_id} onChange={(e) => setForm({ ...form, booking_id: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Phone</label>
              <input style={fieldStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Role Type</label>
              <select style={fieldStyle} value={form.role_type} onChange={(e) => setForm({ ...form, role_type: e.target.value })}>
                <option value="traveler">Traveler</option>
                <option value="minor">Minor</option>
                <option value="representative">Representative</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Gender</label>
              <select style={fieldStyle} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="undisclosed">Undisclosed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Age</label>
              <input type="number" min="0" max="120" style={fieldStyle} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Pax Type</label>
              <select style={fieldStyle} value={form.pax_type} onChange={(e) => setForm({ ...form, pax_type: e.target.value })}>
                <option value="adult">Adult</option>
                <option value="child">Child</option>
                <option value="infant">Infant</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 4, background: '#1976d2', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add Traveler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CSV Upload Modal ────────────────────────────────────────

function CsvUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: Array<{ row: number; message: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const res = await apiClient<{ imported: number; errors: Array<{ row: number; message: string }> }>(
        '/api/v1/admin/import/travelers',
        { method: 'POST', body: JSON.stringify({ csv: text }) }
      );
      setResult(res);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div data-testid="csv-upload-modal" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: '1.5rem', width: '100%', maxWidth: 440,
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Upload CSV</h2>
        {error && <div style={{ color: '#d32f2f', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
        {result && (
          <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#e8f5e9', borderRadius: 4 }}>
            <div style={{ fontWeight: 600, color: '#2e7d32' }}>{result.imported} travelers imported</div>
            {result.errors.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontWeight: 600, color: '#d32f2f', fontSize: '0.85rem' }}>{result.errors.length} error(s):</div>
                <ul style={{ fontSize: '0.8rem', margin: '0.25rem 0 0 1rem', color: '#d32f2f' }}>
                  {result.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                  {result.errors.length > 10 && <li>…and {result.errors.length - 10} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept=".csv" style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Close</button>
          <button type="button" onClick={handleUpload} disabled={uploading} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 4, background: '#388e3c', color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export function OpsMasterTable() {
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === 'super_admin';

  const data = useOpsPanelStore((s) => s.data);
  const total = useOpsPanelStore((s) => s.total);
  const page = useOpsPanelStore((s) => s.page);
  const pageSize = useOpsPanelStore((s) => s.pageSize);
  const totalPages = useOpsPanelStore((s) => s.totalPages);
  const sortBy = useOpsPanelStore((s) => s.sortBy);
  const sortOrder = useOpsPanelStore((s) => s.sortOrder);
  const loading = useOpsPanelStore((s) => s.loading);
  const error = useOpsPanelStore((s) => s.error);
  const editingCell = useOpsPanelStore((s) => s.editingCell);
  const expandedRows = useOpsPanelStore((s) => s.expandedRows);

  const setSort = useOpsPanelStore((s) => s.setSort);
  const setPage = useOpsPanelStore((s) => s.setPage);
  const setPageSize = useOpsPanelStore((s) => s.setPageSize);
  const setEditingCell = useOpsPanelStore((s) => s.setEditingCell);
  const toggleExpandedRow = useOpsPanelStore((s) => s.toggleExpandedRow);
  const patchTraveler = useOpsPanelStore((s) => s.patchTraveler);
  const fetchData = useOpsPanelStore((s) => s.fetchData);

  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  useEffect(() => { fetchData(); }, [fetchData, page, pageSize]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleExportCsv = useCallback(async () => {
    const { search, filters, sortBy, sortOrder, unmaskPii } = useOpsPanelStore.getState();
    const token = useAuthStore.getState().session_token;

    const params = new URLSearchParams();
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    if (search) params.set('q', search);
    if (unmaskPii) params.set('unmask', 'true');
    if (filters.role_type) params.set('role_type', filters.role_type);
    if (filters.access_status) params.set('access_status', filters.access_status);
    if (filters.group_id) params.set('group_id', filters.group_id);
    if (filters.sub_group_id) params.set('sub_group_id', filters.sub_group_id);
    if (filters.hotel_id) params.set('hotel_id', filters.hotel_id);
    if (filters.invitee_type) params.set('invitee_type', filters.invitee_type);
    if (filters.pax_type) params.set('pax_type', filters.pax_type);
    if (filters.checkin_status) params.set('checkin_status', filters.checkin_status);
    if (filters.vip_tag) params.set('vip_tag', filters.vip_tag);

    const url = `/api/v1/admin/master-list/export?${params.toString()}`;
    setExportLoading(true);
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const filename = `admin-panel-export-${today}.csv`;
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(anchor.href);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'CSV export failed');
    } finally {
      setExportLoading(false);
    }
  }, []);

  const handleSave = useCallback(async (travelerId: string, field: string, value: unknown) => {
    await patchTraveler(travelerId, field, value);
    setEditingCell(null);
  }, [patchTraveler, setEditingCell]);

  const handleCancel = useCallback(() => { setEditingCell(null); }, [setEditingCell]);

  const handleCheckinChange = useCallback(async (travelerId: string, newStatus: string) => {
    await patchTraveler(travelerId, 'checkin_status', newStatus);
  }, [patchTraveler]);

  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    fetchData();
  }, [setPageSize, fetchData]);

  const handleSortClick = useCallback((column: string) => {
    setSort(column);
    fetchData();
  }, [setSort, fetchData]);

  return (
    <div className="ops-master-table" data-testid="ops-master-table">
      {/* View Only banner for admin */}
      {!isSuperAdmin && (
        <div data-testid="view-only-banner" style={{
          padding: '0.5rem 1rem', background: '#fff3e0', color: '#e65100',
          borderRadius: 4, marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 500,
        }}>
          🔒 View Only — You do not have permission to edit data.
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <SearchBar />
        <ConnectedFilterBar />

        {isSuperAdmin && (
          <>
            <button
              type="button"
              data-testid="add-traveler-btn"
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid #388e3c',
                borderRadius: 4, background: '#388e3c', color: '#fff', cursor: 'pointer',
              }}
            >
              ➕ Add Traveler
            </button>
            <button
              type="button"
              data-testid="upload-csv-btn"
              onClick={() => setShowCsvModal(true)}
              style={{
                padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid #7b1fa2',
                borderRadius: 4, background: '#7b1fa2', color: '#fff', cursor: 'pointer',
              }}
            >
              📤 Upload CSV
            </button>
            <button
              type="button"
              data-testid="export-csv-btn"
              disabled={exportLoading}
              onClick={handleExportCsv}
              style={{
                padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid #1976d2',
                borderRadius: 4, background: '#1976d2', color: '#fff',
                cursor: exportLoading ? 'not-allowed' : 'pointer', opacity: exportLoading ? 0.6 : 1,
              }}
            >
              {exportLoading ? 'Exporting…' : 'Export CSV'}
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      {showAddModal && <AddTravelerModal onClose={() => setShowAddModal(false)} onSuccess={() => fetchData()} />}
      {showCsvModal && <CsvUploadModal onClose={() => setShowCsvModal(false)} onSuccess={() => fetchData()} />}

      {/* Toast notification */}
      {toast && (
        <div data-testid="export-toast" role="status" style={{
          position: 'fixed', bottom: 24, right: 24, padding: '0.75rem 1.25rem',
          background: '#d32f2f', color: '#fff', borderRadius: 6, zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '0.9rem',
        }}>
          {toast}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="ops-error-banner" role="alert" data-testid="error-banner" style={{
          padding: '0.5rem 1rem', background: '#f8d7da', color: '#721c24',
          borderRadius: 4, marginBottom: '0.75rem',
        }}>
          {error}
          <button type="button" onClick={() => fetchData()} style={{ marginLeft: '1rem' }}>Retry</button>
        </div>
      )}

      {loading && <div data-testid="loading-indicator" style={{ padding: '0.5rem 0', color: '#666' }}>Loading…</div>}

      {!loading && data.length === 0 && !error && (
        <div data-testid="empty-state" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
          No travelers found. Adjust your search or filters.
        </div>
      )}

      {/* Table */}
      {data.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }} data-testid="table-scroll-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 2400 }}>
            <thead>
              <tr>
                {COLUMNS.map((col) => {
                  const stickyStyle: React.CSSProperties = col.sticky
                    ? { position: 'sticky', left: 0, zIndex: 2, background: '#f5f5f5', minWidth: 80, maxWidth: 100 }
                    : {};
                  return (
                    <th
                      key={col.key}
                      data-testid={`col-header-${col.key}`}
                      onClick={col.sortable ? () => handleSortClick(col.key) : undefined}
                      style={{
                        ...stickyStyle,
                        padding: '0.5rem 0.6rem', textAlign: 'left', borderBottom: '2px solid #ccc',
                        background: stickyStyle.background ?? '#f5f5f5',
                        cursor: col.sortable ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none',
                      }}
                      aria-sort={col.sortable && sortBy === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {col.label}
                      {col.sortable && <SortIndicator column={col.key} sortBy={sortBy} sortOrder={sortOrder} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const roomSeq = row.room_assignment?.room_assignment_seq;
                const roomBg = seqColor(roomSeq);
                const isExpanded = expandedRows.has(row.traveler_id);

                return (
                  <Fragment key={row.traveler_id}>
                    <tr data-testid={`row-${row.traveler_id}`}>
                      {COLUMNS.map((col) => {
                        const isEditing = isSuperAdmin && editingCell?.travelerId === row.traveler_id && editingCell?.field === col.key;
                        const cellValue = getCellValue(row, col.key);
                        const isRoomCol = col.group === 'room';
                        const stickyStyle: React.CSSProperties = col.sticky
                          ? { position: 'sticky', left: 0, zIndex: 1, background: '#fff', minWidth: 80, maxWidth: 100 }
                          : {};

                        // Check-in status
                        if (col.key === 'checkin_status') {
                          return (
                            <td key={col.key} style={{ ...stickyStyle, padding: '0.3rem 0.6rem', borderBottom: '1px solid #eee' }}>
                              {isSuperAdmin ? (
                                <CheckinManager
                                  travelerId={row.traveler_id}
                                  currentStatus={row.checkin_status}
                                  onStatusChange={(s) => handleCheckinChange(row.traveler_id, s)}
                                />
                              ) : (
                                <span style={{
                                  display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 8,
                                  fontSize: '0.75rem', fontWeight: 600,
                                  background: row.checkin_status === 'checked_in' ? '#e8f5e9' : row.checkin_status === 'no_show' ? '#fce4ec' : '#f5f5f5',
                                  color: row.checkin_status === 'checked_in' ? '#2e7d32' : row.checkin_status === 'no_show' ? '#c62828' : '#666',
                                }}>
                                  {row.checkin_status ?? 'pending'}
                                </span>
                              )}
                            </td>
                          );
                        }

                        // onsite_flight_change badge
                        if (col.key === 'onsite_flight_change' && !isEditing) {
                          return (
                            <td
                              key={col.key}
                              style={{ padding: '0.3rem 0.6rem', borderBottom: '1px solid #eee', cursor: isSuperAdmin ? 'pointer' : 'default' }}
                              onClick={isSuperAdmin ? () => setEditingCell({ travelerId: row.traveler_id, field: col.key }) : undefined}
                            >
                              {row.onsite_flight_change && (
                                <span className="flight-change-badge" data-testid="flight-change-badge" style={{
                                  display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 8,
                                  background: '#fff3e0', color: '#e65100', fontSize: '0.75rem', fontWeight: 600,
                                }}>
                                  ✈ Changed
                                </span>
                              )}
                              {!row.onsite_flight_change && formatCellDisplay(false, col.key)}
                            </td>
                          );
                        }

                        // Event attendance summary
                        if (col.key === 'event_attendance') {
                          const count = row.event_attendance?.length ?? 0;
                          return (
                            <td
                              key={col.key}
                              data-testid="event-cell"
                              style={{ padding: '0.3rem 0.6rem', borderBottom: '1px solid #eee', cursor: count > 0 ? 'pointer' : 'default' }}
                              onClick={count > 0 ? () => toggleExpandedRow(row.traveler_id) : undefined}
                            >
                              {count > 0 ? (
                                <span style={{ textDecoration: 'underline', color: '#1976d2' }}>
                                  {count} event(s) {isExpanded ? '▲' : '▼'}
                                </span>
                              ) : '—'}
                            </td>
                          );
                        }

                        // Editable cell — InlineEditor (super_admin only)
                        if (isEditing && col.editable) {
                          const fieldType = getFieldType(col.key);
                          return (
                            <td key={col.key} style={{ ...stickyStyle, padding: '0.2rem 0.4rem', borderBottom: '1px solid #eee' }}>
                              <InlineEditor
                                travelerId={row.traveler_id}
                                field={col.key}
                                value={cellValue}
                                fieldType={fieldType}
                                options={getOptionsForField(col.key)}
                                onSave={(f, v) => handleSave(row.traveler_id, f, v)}
                                onCancel={handleCancel}
                              />
                            </td>
                          );
                        }

                        // Default cell
                        return (
                          <td
                            key={col.key}
                            style={{
                              ...stickyStyle,
                              padding: '0.3rem 0.6rem', borderBottom: '1px solid #eee',
                              background: isRoomCol && roomBg ? roomBg : stickyStyle.background,
                              cursor: isSuperAdmin && col.editable ? 'pointer' : 'default',
                              whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                            }}
                            onClick={isSuperAdmin && col.editable ? () => setEditingCell({ travelerId: row.traveler_id, field: col.key }) : undefined}
                          >
                            {formatCellDisplay(cellValue, col.key)}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && row.event_attendance?.length > 0 && (
                      <EventDetailRow events={row.event_attendance} colSpan={COLUMNS.length} />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination footer */}
      <div className="ops-pagination" data-testid="pagination-footer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 0', flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span data-testid="pagination-info">Page {page} of {totalPages} ({total} total)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button type="button" data-testid="prev-page-btn" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchData(); }} style={{ padding: '0.3rem 0.6rem' }}>← Prev</button>
          <button type="button" data-testid="next-page-btn" disabled={page >= totalPages} onClick={() => { setPage(page + 1); fetchData(); }} style={{ padding: '0.3rem 0.6rem' }}>Next →</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            Page size:
            <select value={pageSize} onChange={handlePageSizeChange} data-testid="page-size-select" style={{ padding: '0.2rem 0.4rem' }}>
              {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export default OpsMasterTable;
