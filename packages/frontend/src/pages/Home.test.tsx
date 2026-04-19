/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

// ─── Mocks ───────────────────────────────────────────────────

let mockRole: string | null = 'traveler';

vi.mock('../stores/auth.store', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ role: mockRole }),
}));

const mockGetDb = vi.fn();
vi.mock('../lib/db', () => ({
  getDb: () => mockGetDb(),
}));

vi.mock('../lib/api', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '../lib/api';
const mockApiClient = vi.mocked(apiClient);

function makeDb() {
  return {
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockReturnValue({
      store: { put: vi.fn().mockResolvedValue(undefined) },
      done: Promise.resolve(),
    }),
  };
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'traveler';
    mockGetDb.mockResolvedValue(makeDb());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders greeting with traveler first name', async () => {
    mockApiClient.mockResolvedValueOnce({
      full_name: 'Jane Smith',
      role_type: 'traveler',
      qr_token: 'tok-1',
      group_ids: [],
    });
    // itinerary
    mockApiClient.mockResolvedValueOnce({ events: [] });
    // notifications
    mockApiClient.mockResolvedValueOnce({ notifications: [] });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/Hello, Jane/)).toBeTruthy();
    });
  });

  it('renders My QR, My Itinerary, and Notifications cards', async () => {
    mockApiClient.mockResolvedValueOnce({
      full_name: 'John Doe',
      role_type: 'traveler',
      qr_token: 'tok-1',
      group_ids: [],
    });
    mockApiClient.mockResolvedValueOnce({ events: [] });
    mockApiClient.mockResolvedValueOnce({ notifications: [] });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('My QR Code')).toBeTruthy();
    });
    expect(screen.getByText('My Itinerary')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows Family Wallet card only for representatives', async () => {
    mockRole = 'representative';
    mockApiClient.mockResolvedValueOnce({
      full_name: 'Parent User',
      role_type: 'representative',
      qr_token: 'tok-2',
      group_ids: [],
    });
    mockApiClient.mockResolvedValueOnce({ events: [] });
    mockApiClient.mockResolvedValueOnce({ notifications: [] });
    mockApiClient.mockResolvedValueOnce({ family_id: 'f1', members: [{ traveler_id: 't1' }, { traveler_id: 't2' }] });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Family Wallet')).toBeTruthy();
    });
    expect(screen.getByText('2 linked members')).toBeTruthy();
  });

  it('does not show Family Wallet card for regular travelers', async () => {
    mockRole = 'traveler';
    mockApiClient.mockResolvedValueOnce({
      full_name: 'Regular User',
      role_type: 'traveler',
      qr_token: 'tok-3',
      group_ids: [],
    });
    mockApiClient.mockResolvedValueOnce({ events: [] });
    mockApiClient.mockResolvedValueOnce({ notifications: [] });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('My QR Code')).toBeTruthy();
    });
    expect(screen.queryByText('Family Wallet')).toBeNull();
  });

  it('shows unread notification count badge', async () => {
    mockApiClient.mockResolvedValueOnce({
      full_name: 'Test User',
      role_type: 'traveler',
      qr_token: 'tok-4',
      group_ids: [],
    });
    mockApiClient.mockResolvedValueOnce({ events: [] });
    mockApiClient.mockResolvedValueOnce({
      notifications: [
        { notification_id: 'n1', title: 'A', body: 'B', published_at: '2025-01-01', read_at: null },
        { notification_id: 'n2', title: 'C', body: 'D', published_at: '2025-01-02', read_at: '2025-01-02' },
        { notification_id: 'n3', title: 'E', body: 'F', published_at: '2025-01-03', read_at: null },
      ],
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy();
    });
  });
});
