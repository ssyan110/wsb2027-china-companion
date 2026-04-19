/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ExtendedMasterListRow } from '@wsb/shared';

// ─── Mocks ───────────────────────────────────────────────────

// Mock auth store
vi.mock('../../../stores/auth.store', () => ({
  useAuthStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ session_token: 'tok', role: 'admin', isAuthenticated: true, traveler_id: 'a1' }),
    { getState: () => ({ session_token: 'tok', role: 'admin' }) },
  ),
}));

// Mock api client
vi.mock('../../../lib/api', () => ({
  apiClient: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, page_size: 50, total_pages: 0 }),
}));

// Build a minimal mock row
function makeMockRow(overrides: Partial<ExtendedMasterListRow> = {}): ExtendedMasterListRow {
  return {
    traveler_id: 'tid-1',
    booking_id: 'BK001',
    family_id: null,
    representative_id: null,
    full_name_raw: 'John Doe',
    full_name_normalized: 'john doe',
    email_primary: 'j***@example.com',
    passport_name: null,
    phone: null,
    role_type: 'traveler',
    access_status: 'activated',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    groups: [],
    hotels: [],
    flights: [],
    bus_assignments: [],
    qr_active: true,
    first_name: 'John',
    last_name: 'Doe',
    gender: 'male',
    age: 35,
    invitee_type: 'invitee',
    registration_type: 'standard',
    pax_type: 'adult',
    vip_tag: null,
    internal_id: 'INT001',
    agent_code: 'AG01',
    party_total: 2,
    party_adults: 2,
    party_children: 0,
    dietary_vegan: false,
    dietary_notes: null,
    remarks: null,
    repeat_attendee: 1,
    jba_repeat: false,
    checkin_status: 'pending',
    onsite_flight_change: false,
    smd_name: null,
    ceo_name: null,
    photo_url: null,
    room_assignment: null,
    arrival_flight: null,
    departure_flight: null,
    event_attendance: [],
    ...overrides,
  };
}

// Store mock state
let mockStoreState: Record<string, unknown>;

const defaultStoreState = {
  data: [] as ExtendedMasterListRow[],
  total: 0,
  page: 1,
  pageSize: 50,
  totalPages: 0,
  search: '',
  filters: {},
  sortBy: 'created_at',
  sortOrder: 'desc',
  loading: false,
  error: null,
  editingCell: null,
  expandedRows: new Set<string>(),
  unmaskPii: false,
  fetchData: vi.fn(),
  setPage: vi.fn(),
  setPageSize: vi.fn(),
  setSearch: vi.fn(),
  setFilter: vi.fn(),
  clearFilters: vi.fn(),
  setSort: vi.fn(),
  setEditingCell: vi.fn(),
  toggleExpandedRow: vi.fn(),
  setUnmaskPii: vi.fn(),
  patchTraveler: vi.fn(),
};

vi.mock('../../../stores/ops-panel.store', () => ({
  useOpsPanelStore: (selector: (s: Record<string, unknown>) => unknown) => selector(mockStoreState),
  countActiveFilters: (filters: Record<string, unknown>) =>
    Object.values(filters).filter((v) => v !== undefined && v !== '').length,
}));

// Must import AFTER mocks
import { OpsMasterTable } from '../OpsMasterTable';

describe('OpsMasterTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = { ...defaultStoreState, fetchData: vi.fn(), setPage: vi.fn(), setPageSize: vi.fn(), setSort: vi.fn(), setEditingCell: vi.fn(), toggleExpandedRow: vi.fn(), patchTraveler: vi.fn(), setSearch: vi.fn(), setFilter: vi.fn(), clearFilters: vi.fn(), setUnmaskPii: vi.fn() };
  });
  afterEach(() => { cleanup(); });

  it('renders column headers', () => {
    const rows = [makeMockRow()];
    mockStoreState = { ...mockStoreState, data: rows, total: 1, totalPages: 1 };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    // Check key column headers exist
    expect(screen.getByTestId('col-header-first_name')).toBeTruthy();
    expect(screen.getByTestId('col-header-last_name')).toBeTruthy();
    expect(screen.getByTestId('col-header-gender')).toBeTruthy();
    expect(screen.getByTestId('col-header-age')).toBeTruthy();
    expect(screen.getByTestId('col-header-invitee_type')).toBeTruthy();
    expect(screen.getByTestId('col-header-pax_type')).toBeTruthy();
    expect(screen.getByTestId('col-header-checkin_status')).toBeTruthy();
    expect(screen.getByTestId('col-header-room_number')).toBeTruthy();
    expect(screen.getByTestId('col-header-arr_airline')).toBeTruthy();
    expect(screen.getByTestId('col-header-dep_airline')).toBeTruthy();
    expect(screen.getByTestId('col-header-event_attendance')).toBeTruthy();

    // Verify label text
    expect(screen.getByTestId('col-header-first_name').textContent).toContain('First Name');
    expect(screen.getByTestId('col-header-last_name').textContent).toContain('Last Name');
  });

  it('renders pagination controls with correct info', () => {
    const rows = [makeMockRow()];
    mockStoreState = { ...mockStoreState, data: rows, total: 150, page: 2, totalPages: 3, pageSize: 50 };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    const info = screen.getByTestId('pagination-info');
    expect(info.textContent).toContain('Page 2 of 3');
    expect(info.textContent).toContain('150 total');

    expect(screen.getByTestId('prev-page-btn')).toBeTruthy();
    expect(screen.getByTestId('next-page-btn')).toBeTruthy();
    expect(screen.getByTestId('page-size-select')).toBeTruthy();

    // Page size options
    const select = screen.getByTestId('page-size-select') as HTMLSelectElement;
    expect(select.value).toBe('50');
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.map((o) => o.value)).toEqual(['25', '50', '100', '200']);
  });

  it('renders empty state when no data', () => {
    mockStoreState = { ...mockStoreState, data: [], total: 0, totalPages: 0, loading: false, error: null };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByTestId('empty-state').textContent).toContain('No travelers found');
  });

  it('renders search bar', () => {
    mockStoreState = { ...mockStoreState, data: [makeMockRow()], total: 1, totalPages: 1 };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    expect(screen.getByTestId('search-bar')).toBeTruthy();
  });

  it('renders filter bar', () => {
    mockStoreState = { ...mockStoreState, data: [makeMockRow()], total: 1, totalPages: 1 };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    expect(screen.getByTestId('filter-bar')).toBeTruthy();
  });

  it('disables prev button on first page', () => {
    mockStoreState = { ...mockStoreState, data: [makeMockRow()], total: 50, page: 1, totalPages: 2 };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    const prevBtn = screen.getByTestId('prev-page-btn') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
  });

  it('disables next button on last page', () => {
    mockStoreState = { ...mockStoreState, data: [makeMockRow()], total: 50, page: 2, totalPages: 2 };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    const nextBtn = screen.getByTestId('next-page-btn') as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });

  it('renders loading indicator when loading', () => {
    mockStoreState = { ...mockStoreState, data: [], loading: true };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders error banner with retry button', () => {
    mockStoreState = { ...mockStoreState, data: [], error: 'Network error' };

    render(<MemoryRouter><OpsMasterTable /></MemoryRouter>);

    const banner = screen.getByTestId('error-banner');
    expect(banner.textContent).toContain('Network error');
    expect(banner.querySelector('button')).toBeTruthy();
  });
});
