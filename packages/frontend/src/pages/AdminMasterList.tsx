import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useMasterListStore } from '../stores/master-list.store';
import { useAuthStore } from '../stores/auth.store';
import { ColumnVisibilityPanel } from '../components/ColumnVisibilityPanel';
import { RoleTypes, AccessStatuses } from '@wsb/shared';
import type { MasterListRow } from '@wsb/shared';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const COLUMN_LABELS: Record<string, string> = {
  traveler_id: 'Traveler ID',
  booking_id: 'Booking ID',
  family_id: 'Family ID',
  representative_id: 'Representative ID',
  guardian_id: 'Guardian ID',
  full_name_raw: 'Full Name',
  full_name_normalized: 'Normalized Name',
  email_primary: 'Email',
  email_aliases: 'Email Aliases',
  passport_name: 'Passport Name',
  phone: 'Phone',
  role_type: 'Role',
  access_status: 'Access Status',
  created_at: 'Created',
  updated_at: 'Updated',
  groups: 'Groups',
  hotels: 'Hotels',
  flights: 'Flights',
  bus_assignments: 'Bus Assignments',
  qr_active: 'QR Active',
};

const SORTABLE_COLUMNS = new Set([
  'full_name_raw',
  'full_name_normalized',
  'email_primary',
  'booking_id',
  'role_type',
  'access_status',
  'created_at',
  'updated_at',
  'phone',
  'passport_name',
]);

function formatCellValue(row: MasterListRow, column: string): string {
  const value = (row as unknown as Record<string, unknown>)[column];
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    // flights: [{flight_number, arrival_time}]
    if (column === 'flights') {
      return (value as { flight_number: string; arrival_time: string }[])
        .map((f) => f.flight_number)
        .join(', ');
    }
    // bus_assignments: [{bus_number, event_name}]
    if (column === 'bus_assignments') {
      return (value as { bus_number: string; event_name: string }[])
        .map((b) => `${b.bus_number} (${b.event_name})`)
        .join(', ');
    }
    return value.join(', ');
  }
  return String(value);
}

function buildExportUrl(state: {
  search: string;
  filters: { role_type?: string; access_status?: string; group_id?: string; hotel_id?: string };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}): string {
  const params = new URLSearchParams();
  params.set('sort_by', state.sortBy);
  params.set('sort_order', state.sortOrder);
  if (state.search) params.set('q', state.search);
  if (state.filters.role_type) params.set('role_type', state.filters.role_type);
  if (state.filters.access_status) params.set('access_status', state.filters.access_status);
  if (state.filters.group_id) params.set('group_id', state.filters.group_id);
  if (state.filters.hotel_id) params.set('hotel_id', state.filters.hotel_id);
  return `/api/v1/admin/master-list/export?${params.toString()}`;
}

export default function AdminMasterList() {
  const {
    data,
    total,
    page,
    pageSize,
    totalPages,
    search,
    filters,
    sortBy,
    sortOrder,
    loading,
    error,
    visibleColumns,
    fetchData,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    setSort,
  } = useMasterListStore();

  const token = useAuthStore((s) => s.session_token);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<string>(search);

  // Derive available columns from the first data row (respects role-based field visibility)
  const availableColumns = useMemo(() => {
    if (data.length === 0) {
      return Object.keys(COLUMN_LABELS);
    }
    return Object.keys(COLUMN_LABELS).filter((col) => col in data[0]);
  }, [data]);

  // Fetch on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch when filters, sort, or pagination change (but not search — that's debounced)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters, sortBy, sortOrder]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      searchInputRef.current = value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearch(value);
        fetchData();
      }, 300);
    },
    [setSearch, fetchData],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSort = useCallback(
    (column: string) => {
      if (!SORTABLE_COLUMNS.has(column)) return;
      setSort(column);
    },
    [setSort],
  );

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(e.target.value));
    },
    [setPageSize],
  );

  const handleExport = useCallback(() => {
    const url = buildExportUrl({ search, filters, sortBy, sortOrder });
    const link = document.createElement('a');
    // Append auth token as query param for download
    const separator = url.includes('?') ? '&' : '?';
    link.href = token ? `${url}${separator}token=${encodeURIComponent(token)}` : url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [search, filters, sortBy, sortOrder, token]);

  const handleRetry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Columns to render: intersection of visibleColumns and availableColumns
  const columnsToRender = useMemo(
    () => visibleColumns.filter((col) => availableColumns.includes(col)),
    [visibleColumns, availableColumns],
  );

  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) return null;
    return <span aria-hidden="true">{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>;
  };

  return (
    <div className="admin-page" data-testid="admin-master-list">
      <h1 className="admin-title">Master List</h1>

      {/* Toolbar: Search, Filters, Column Visibility, Export */}
      <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <input
          className="admin-search"
          placeholder="Search by name, email, booking ID, phone…"
          defaultValue={search}
          onChange={handleSearchChange}
          aria-label="Search master list"
          disabled={loading}
        />
        <select
          className="admin-filter"
          value={filters.role_type ?? ''}
          onChange={(e) => setFilter('role_type', e.target.value)}
          aria-label="Filter by role"
          disabled={loading}
        >
          <option value="">All Roles</option>
          {RoleTypes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="admin-filter"
          value={filters.access_status ?? ''}
          onChange={(e) => setFilter('access_status', e.target.value)}
          aria-label="Filter by access status"
          disabled={loading}
        >
          <option value="">All Statuses</option>
          {AccessStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="admin-filter"
          value={filters.group_id ?? ''}
          onChange={(e) => setFilter('group_id', e.target.value)}
          aria-label="Filter by group"
          disabled={loading}
        >
          <option value="">All Groups</option>
          {/* Group options are derived from data */}
          {[...new Set(data.flatMap((r) => r.groups))].sort().map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className="admin-filter"
          value={filters.hotel_id ?? ''}
          onChange={(e) => setFilter('hotel_id', e.target.value)}
          aria-label="Filter by hotel"
          disabled={loading}
        >
          <option value="">All Hotels</option>
          {[...new Set(data.flatMap((r) => r.hotels))].sort().map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <ColumnVisibilityPanel availableColumns={availableColumns} />
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleExport}
          disabled={loading}
          aria-label="Export CSV"
        >
          Export CSV
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="admin-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span>{error}</span>
          <button className="admin-btn admin-btn-secondary" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-screen" role="status" aria-label="Loading master list">
          <div className="loading-spinner" />
          <p>Loading master list…</p>
        </div>
      ) : (
        <>
          {/* Data Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" aria-label="Master list table">
              <thead>
                <tr>
                  {columnsToRender.map((col) => {
                    const isSortable = SORTABLE_COLUMNS.has(col);
                    return (
                      <th
                        key={col}
                        onClick={isSortable ? () => handleSort(col) : undefined}
                        style={isSortable ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                        aria-sort={
                          sortBy === col
                            ? sortOrder === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                      >
                        {COLUMN_LABELS[col] ?? col}
                        {renderSortIndicator(col)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columnsToRender.length} style={{ textAlign: 'center', padding: '24px' }}>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.traveler_id}>
                      {columnsToRender.map((col) => (
                        <td key={col}>{formatCellValue(row, col)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            className="admin-pagination"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '16px',
              padding: '8px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages} ({total} records)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="admin-btn-sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                ← Prev
              </button>
              <button
                className="admin-btn-sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next →
              </button>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Rows:
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  aria-label="Page size"
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-medium)' }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
