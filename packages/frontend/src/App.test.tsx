/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────

let mockRole: string | null = 'admin';

vi.mock('./stores/auth.store', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      session_token: 'tok-test',
      traveler_id: 'tid-1',
      role: mockRole,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    }),
}));

vi.mock('./stores/app.store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setOnline: vi.fn() }),
}));

vi.mock('./stores/ops-panel.store', () => ({
  useOpsPanelStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        data: [],
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
      }),
    { getState: () => ({ session_token: 'tok', role: 'admin', search: '', filters: {}, sortBy: 'created_at', sortOrder: 'desc', unmaskPii: false }) },
  ),
  countActiveFilters: () => 0,
}));

vi.mock('./lib/api', () => ({
  apiClient: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, page_size: 50, total_pages: 0 }),
}));

// Stub out heavy page components to keep tests fast
vi.mock('./pages/Login', () => ({ default: () => <div data-testid="login-page">Login</div> }));
vi.mock('./pages/Home', () => ({ default: () => <div data-testid="home-page">Home</div> }));
vi.mock('./pages/QrDisplay', () => ({ default: () => <div>QR</div> }));
vi.mock('./pages/FamilyWallet', () => ({ default: () => <div>Family</div> }));
vi.mock('./pages/Itinerary', () => ({ default: () => <div>Itinerary</div> }));
vi.mock('./pages/Notifications', () => ({ default: () => <div>Notifications</div> }));
vi.mock('./pages/ToolkitHub', () => ({ default: () => <div>Toolkit</div> }));
vi.mock('./pages/TaxiCard', () => ({ default: () => <div>Taxi</div> }));
vi.mock('./pages/Phrasebook', () => ({ default: () => <div>Phrasebook</div> }));
vi.mock('./pages/CurrencyConverter', () => ({ default: () => <div>Currency</div> }));
vi.mock('./pages/EmergencyInfo', () => ({ default: () => <div>Emergency</div> }));
vi.mock('./pages/StaffScanner', () => ({ default: () => <div>Scanner</div> }));
vi.mock('./pages/StaffRescue', () => ({ default: () => <div>Rescue</div> }));
vi.mock('./pages/AdminDashboard', () => ({ default: () => <div>AdminDash</div> }));
vi.mock('./pages/AdminTravelers', () => ({ default: () => <div>AdminTravelers</div> }));
vi.mock('./pages/AdminGroups', () => ({ default: () => <div>AdminGroups</div> }));
vi.mock('./pages/AdminEvents', () => ({ default: () => <div>AdminEvents</div> }));
vi.mock('./pages/AdminDispatch', () => ({ default: () => <div>AdminDispatch</div> }));
vi.mock('./pages/AdminNotifications', () => ({ default: () => <div>AdminNotif</div> }));
vi.mock('./pages/AdminAudit', () => ({ default: () => <div>AdminAudit</div> }));
vi.mock('./pages/AdminMasterList', () => ({ default: () => <div>AdminMasterList</div> }));
vi.mock('./components/Layout', () => ({
  Layout: () => {
    const { Outlet } = require('react-router-dom');
    return <div data-testid="layout"><Outlet /></div>;
  },
}));

import { App } from './App';

// ─── Helpers ─────────────────────────────────────────────────

function renderApp(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe('Ops routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'admin';
  });
  afterEach(() => { cleanup(); });

  it('navigating to /ops redirects to /ops/travelers', () => {
    renderApp('/ops');
    // OpsLayout renders, and the index route redirects to /ops/travelers
    // which renders OpsMasterTable with its data-testid
    expect(screen.getByTestId('ops-master-table')).toBeTruthy();
  });

  it('renders OpsMasterTable at /ops/travelers', () => {
    renderApp('/ops/travelers');
    expect(screen.getByTestId('ops-master-table')).toBeTruthy();
  });

  it('renders OpsRooms at /ops/rooms', () => {
    renderApp('/ops/rooms');
    expect(screen.getByTestId('ops-rooms-page')).toBeTruthy();
  });

  it('renders OpsFlights at /ops/flights', () => {
    renderApp('/ops/flights');
    expect(screen.getByTestId('ops-flights-page')).toBeTruthy();
  });

  it('renders OpsEvents at /ops/events', () => {
    renderApp('/ops/events');
    expect(screen.getByTestId('ops-events-page')).toBeTruthy();
  });

  it('renders OpsAuditLog at /ops/audit', () => {
    renderApp('/ops/audit');
    expect(screen.getByTestId('ops-audit-log-page')).toBeTruthy();
  });

  it('redirects non-admin role (traveler) to login from /ops', () => {
    mockRole = 'traveler';
    renderApp('/ops');
    expect(screen.getByTestId('login-page')).toBeTruthy();
  });

  it('redirects non-admin role (staff) to login from /ops/travelers', () => {
    mockRole = 'staff';
    renderApp('/ops/travelers');
    expect(screen.getByTestId('login-page')).toBeTruthy();
  });

  it('allows super_admin role to access /ops', () => {
    mockRole = 'super_admin';
    renderApp('/ops/travelers');
    expect(screen.getByTestId('ops-master-table')).toBeTruthy();
  });

  it('keeps existing /admin routes untouched', () => {
    renderApp('/admin');
    expect(screen.getByText('AdminDash')).toBeTruthy();
  });
});
