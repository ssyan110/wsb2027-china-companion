import { Fragment, useEffect, useCallback, useRef, useState } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { useAuthStore } from '../../stores/auth.store';
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
  // Sticky name columns
  { key: 'first_name', label: 'First Name', sortable: true, editable: true, sticky: true },
  { key: 'last_name', label: 'Last Name', sortable: true, editable: true, sticky: true },
  // Traveler scalars
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
  // Room assignment columns
  { key: 'room_number', label: 'Room #', sortable: false, editable: false, group: 'room' },
  { key: 'occupancy', label: 'Occupancy', sortable: false, editable: false, group: 'room' },
  { key: 'paid_room_type', label: 'Room Type', sortable: false, editable: false, group: 'room' },
  { key: 'hotel_confirmation_no', label: 'Hotel Conf.', sortable: false, editable: false, group: 'room' },
  { key: 'preferred_roommates', label: 'Roommates', sortable: false, editable: false, group: 'room' },
  // Arrival flight columns
  { key: 'arr_airline', label: 'Arr. Airline', sortable: false, editable: false, group: 'arrival' },
  { key: 'arr_flight', label: 'Arr. Flight', sortable: false, editable: false, group: 'arrival' },
  { key: 'arr_time', label: 'Arr. Time', sortable: false, editable: false, group: 'arrival' },
  { key: 'arr_terminal', label: 'Arr. Terminal', sortable: false, editable: false, group: 'arrival' },
  // Departure flight columns
  { key: 'dep_airline', label: 'Dep. Airline', sortable: false, editable: false, group: 'departure' },
  { key: 'dep_flight', label: 'Dep. Flight', sortable: false, editable: false, group: 'departure' },
  { key: 'dep_time', label: 'Dep. Time', sortable: false, editable: false, group: 'departure' },
  { key: 'dep_terminal', label: 'Dep. Terminal', sortable: false, editable: false, group: 'departure' },
  // Event attendance summary
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
  // Room assignment fields
  if (colKey === 'room_number') return row.room_assignment?.room_number ?? '';
  if (colKey === 'occupancy') return row.room_assignment?.occupancy ?? '';
  if (colKey === 'paid_room_type') return row.room_assignment?.paid_room_type ?? '';
  if (colKey === 'hotel_confirmation_no') return row.room_assignment?.hotel_confirmation_no ?? '';
  if (colKey === 'preferred_roommates') return row.room_assignment?.preferred_roommates ?? '';
  // Arrival flight fields
  if (colKey === 'arr_airline') return row.arrival_flight?.airline ?? '';
  if (colKey === 'arr_flight') return row.arrival_flight?.flight_number ?? '';
  if (colKey === 'arr_time') return row.arrival_flight?.time ?? '';
  if (colKey === 'arr_terminal') return row.arrival_flight?.terminal ?? '';
  // Departure flight fields
  if (colKey === 'dep_airline') return row.departure_flight?.airline ?? '';
  if (colKey === 'dep_flight') return row.departure_flight?.flight_number ?? '';
  if (colKey === 'dep_time') return row.departure_flight?.time ?? '';
  if (colKey === 'dep_terminal') return row.departure_flight?.terminal ?? '';
  // Event attendance summary
  if (colKey === 'event_attendance') {
    const count = row.event_attendance?.length ?? 0;
    return count > 0 ? `${count} event(s)` : '—';
  }
  // Direct traveler fields
  return (row as Record<string, unknown>)[colKey] ?? '';
}

function formatCellDisplay(value: unknown, colKey: string): string {
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

  // Sync external search changes
  useEffect(() => {
    setLocalValue(search);
  }, [search]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

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

// ─── Main component ──────────────────────────────────────────

export function OpsMasterTable() {
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

  // Fetch data on mount and when page/pageSize change
  useEffect(() => {
    fetchData();
  }, [fetchData, page, pageSize]);

  // Auto-dismiss toast after 4 seconds
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
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status} ${res.statusText}`);
      }
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

  const handleCancel = useCallback(() => {
    setEditingCell(null);
  }, [setEditingCell]);

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

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="ops-master-table" data-testid="ops-master-table">
      {/* Toolbar: Search + Filters + Export */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <SearchBar />
        <ConnectedFilterBar />
        <button
          type="button"
          data-testid="export-csv-btn"
          disabled={exportLoading}
          onClick={handleExportCsv}
          style={{
            padding: '0.4rem 0.75rem',
            fontSize: '0.9rem',
            border: '1px solid #1976d2',
            borderRadius: 4,
            background: '#1976d2',
            color: '#fff',
            cursor: exportLoading ? 'not-allowed' : 'pointer',
            opacity: exportLoading ? 0.6 : 1,
          }}
        >
          {exportLoading ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

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

      {/* Loading indicator */}
      {loading && (
        <div data-testid="loading-indicator" style={{ padding: '0.5rem 0', color: '#666' }}>Loading…</div>
      )}

      {/* Empty state */}
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
                    ? { position: 'sticky', left: col.key === 'first_name' ? 0 : 120, zIndex: 2, background: '#f5f5f5' }
                    : {};
                  return (
                    <th
                      key={col.key}
                      data-testid={`col-header-${col.key}`}
                      onClick={col.sortable ? () => handleSortClick(col.key) : undefined}
                      style={{
                        ...stickyStyle,
                        padding: '0.5rem 0.6rem',
                        textAlign: 'left',
                        borderBottom: '2px solid #ccc',
                        background: stickyStyle.background ?? '#f5f5f5',
                        cursor: col.sortable ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
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
                        const isEditing = editingCell?.travelerId === row.traveler_id && editingCell?.field === col.key;
                        const cellValue = getCellValue(row, col.key);
                        const isRoomCol = col.group === 'room';
                        const stickyStyle: React.CSSProperties = col.sticky
                          ? { position: 'sticky', left: col.key === 'first_name' ? 0 : 120, zIndex: 1, background: '#fff' }
                          : {};

                        // Check-in status uses CheckinManager
                        if (col.key === 'checkin_status') {
                          return (
                            <td key={col.key} style={{ ...stickyStyle, padding: '0.3rem 0.6rem', borderBottom: '1px solid #eee' }}>
                              <CheckinManager
                                travelerId={row.traveler_id}
                                currentStatus={row.checkin_status}
                                onStatusChange={(s) => handleCheckinChange(row.traveler_id, s)}
                              />
                            </td>
                          );
                        }

                        // onsite_flight_change badge
                        if (col.key === 'onsite_flight_change' && !isEditing) {
                          return (
                            <td
                              key={col.key}
                              style={{ padding: '0.3rem 0.6rem', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                              onClick={() => setEditingCell({ travelerId: row.traveler_id, field: col.key })}
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

                        // Event attendance summary — clickable to expand
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

                        // Editable cell — show InlineEditor when editing
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

                        // Default cell rendering
                        return (
                          <td
                            key={col.key}
                            style={{
                              ...stickyStyle,
                              padding: '0.3rem 0.6rem',
                              borderBottom: '1px solid #eee',
                              background: isRoomCol && roomBg ? roomBg : stickyStyle.background,
                              cursor: col.editable ? 'pointer' : 'default',
                              whiteSpace: 'nowrap',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            onClick={col.editable ? () => setEditingCell({ travelerId: row.traveler_id, field: col.key }) : undefined}
                          >
                            {formatCellDisplay(cellValue, col.key)}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Expanded event attendance detail */}
                    {isExpanded && row.event_attendance?.length > 0 && (
                      <EventDetailRow
                        events={row.event_attendance}
                        colSpan={COLUMNS.length}
                      />
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
          <span data-testid="pagination-info">
            Page {page} of {totalPages} ({total} total)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            data-testid="prev-page-btn"
            disabled={page <= 1}
            onClick={() => { setPage(page - 1); fetchData(); }}
            style={{ padding: '0.3rem 0.6rem' }}
          >
            ← Prev
          </button>
          <button
            type="button"
            data-testid="next-page-btn"
            disabled={page >= totalPages}
            onClick={() => { setPage(page + 1); fetchData(); }}
            style={{ padding: '0.3rem 0.6rem' }}
          >
            Next →
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            Page size:
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              data-testid="page-size-select"
              style={{ padding: '0.2rem 0.4rem' }}
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export default OpsMasterTable;
