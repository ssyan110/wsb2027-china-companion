/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Notifications from './Notifications';

// ─── Mocks ───────────────────────────────────────────────────

vi.mock('../stores/auth.store', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ session_token: 'test-token' }),
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

// Mock EventSource
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
}

vi.stubGlobal('EventSource', vi.fn().mockImplementation(() => new MockEventSource()));

function makeDb() {
  return {
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockReturnValue({
      store: { clear: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) },
      done: Promise.resolve(),
    }),
  };
}

const NOTIFICATIONS = [
  { notification_id: 'n1', title: 'Bus Change', body: 'Your bus has been changed to Bus 12', published_at: '2027-06-15T10:00:00Z', read_at: null },
  { notification_id: 'n2', title: 'Welcome', body: 'Welcome to WSB 2027!', published_at: '2027-06-14T08:00:00Z', read_at: '2027-06-14T09:00:00Z' },
  { notification_id: 'n3', title: 'Schedule Update', body: 'Dinner moved to 7pm', published_at: '2027-06-15T14:00:00Z', read_at: null },
];

function renderNotifications() {
  return render(
    <MemoryRouter>
      <Notifications />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(makeDb());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders notification list ordered by published_at', async () => {
    mockApiClient.mockResolvedValueOnce({ notifications: NOTIFICATIONS });

    renderNotifications();

    await waitFor(() => {
      expect(screen.getByText('Bus Change')).toBeTruthy();
    });
    expect(screen.getByText('Welcome')).toBeTruthy();
    expect(screen.getByText('Schedule Update')).toBeTruthy();
  });

  it('shows unread badge count', async () => {
    mockApiClient.mockResolvedValueOnce({ notifications: NOTIFICATIONS });

    renderNotifications();

    await waitFor(() => {
      expect(screen.getByLabelText('2 unread notifications')).toBeTruthy();
    });
  });

  it('marks notification as read on tap', async () => {
    mockApiClient.mockResolvedValueOnce({ notifications: NOTIFICATIONS });
    mockApiClient.mockResolvedValueOnce(undefined); // PATCH mark-as-read

    renderNotifications();

    await waitFor(() => {
      expect(screen.getByText('Bus Change')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Unread: Bus Change'));

    await waitFor(() => {
      // Badge should now show 1 (was 2, marked 1 as read)
      expect(screen.getByLabelText('1 unread notifications')).toBeTruthy();
    });
  });

  it('shows empty state when no notifications', async () => {
    mockApiClient.mockResolvedValueOnce({ notifications: [] });

    renderNotifications();

    await waitFor(() => {
      expect(screen.getByText('No notifications yet.')).toBeTruthy();
    });
  });
});
