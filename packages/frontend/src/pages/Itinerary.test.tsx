/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Itinerary from './Itinerary';

// ─── Mocks ───────────────────────────────────────────────────

let mockIsOnline = true;

vi.mock('../stores/app.store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ isOnline: mockIsOnline }),
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
      store: { clear: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) },
      done: Promise.resolve(),
    }),
  };
}

const EVENTS = [
  {
    event_id: 'e1',
    name: 'Welcome Dinner',
    event_type: 'meal',
    date: '2027-06-15',
    start_time: '2027-06-15T18:00:00Z',
    end_time: '2027-06-15T20:00:00Z',
    location: 'Grand Ballroom',
    description: 'Opening night dinner',
  },
  {
    event_id: 'e2',
    name: 'City Tour',
    event_type: 'activity',
    date: '2027-06-16',
    start_time: '2027-06-16T09:00:00Z',
    end_time: '2027-06-16T12:00:00Z',
    location: 'Hotel Lobby',
    description: null,
  },
];

function renderItinerary() {
  return render(
    <MemoryRouter>
      <Itinerary />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe('Itinerary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnline = true;
    mockGetDb.mockResolvedValue(makeDb());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders events grouped by date', async () => {
    mockApiClient.mockResolvedValueOnce({ events: EVENTS });

    renderItinerary();

    await waitFor(() => {
      expect(screen.getByText('Welcome Dinner')).toBeTruthy();
    });
    expect(screen.getByText('City Tour')).toBeTruthy();
    expect(screen.getByText('Grand Ballroom')).toBeTruthy();
    expect(screen.getByText('Hotel Lobby')).toBeTruthy();
  });

  it('shows event type icons', async () => {
    mockApiClient.mockResolvedValueOnce({ events: EVENTS });

    renderItinerary();

    await waitFor(() => {
      // Icons are now Lucide SVGs rendered inside .itinerary-event-icon spans
      const icons = document.querySelectorAll('.itinerary-event-icon');
      expect(icons.length).toBe(2);
      // Each icon span should contain an SVG element
      icons.forEach(icon => {
        expect(icon.querySelector('svg')).toBeTruthy();
      });
    });
  });

  it('shows refresh button when online', async () => {
    mockIsOnline = true;
    mockApiClient.mockResolvedValueOnce({ events: [] });

    renderItinerary();

    await waitFor(() => {
      expect(screen.getByLabelText('Refresh itinerary')).toBeTruthy();
    });
  });

  it('shows offline banner when offline', async () => {
    mockIsOnline = false;
    const db = makeDb();
    db.getAll.mockResolvedValue(EVENTS);
    db.get.mockResolvedValue({ entity: 'itinerary', last_synced: '2027-06-15T10:00:00Z' });
    mockGetDb.mockResolvedValue(db);
    mockApiClient.mockRejectedValueOnce(new Error('offline'));

    renderItinerary();

    await waitFor(() => {
      expect(screen.getByText(/Offline — showing last synced schedule/)).toBeTruthy();
    });
  });

  it('shows empty state when no events', async () => {
    mockApiClient.mockResolvedValueOnce({ events: [] });

    renderItinerary();

    await waitFor(() => {
      expect(screen.getByText('No events in your itinerary.')).toBeTruthy();
    });
  });
});
