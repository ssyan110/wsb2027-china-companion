/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QrDisplay from './QrDisplay';

// ─── Mocks ───────────────────────────────────────────────────

const mockGetDb = vi.fn();
vi.mock('../lib/db', () => ({
  getDb: () => mockGetDb(),
}));

vi.mock('../lib/api', () => ({
  apiClient: vi.fn(),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <svg data-testid="qr-svg" data-value={value} width={size} height={size} />
  ),
}));

import { apiClient } from '../lib/api';
const mockApiClient = vi.mocked(apiClient);

function makeDb() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

function renderQr() {
  return render(
    <MemoryRouter>
      <QrDisplay />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe('QrDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(makeDb());
    // Mock navigator.wakeLock
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) }) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders QR code with token value from API', async () => {
    mockApiClient.mockResolvedValueOnce({
      traveler_id: 't1',
      full_name: 'Alice Johnson',
      role_type: 'traveler',
      qr_token: 'QR-TOKEN-ABC',
      group_ids: ['g1'],
    });

    renderQr();

    await waitFor(() => {
      const svg = screen.getByTestId('qr-svg');
      expect(svg.getAttribute('data-value')).toBe('QR-TOKEN-ABC');
    });
  });

  it('displays traveler full name and role below QR', async () => {
    mockApiClient.mockResolvedValueOnce({
      traveler_id: 't1',
      full_name: 'Bob Williams',
      role_type: 'representative',
      qr_token: 'QR-TOKEN-XYZ',
      group_ids: [],
    });

    renderQr();

    await waitFor(() => {
      expect(screen.getByText('Bob Williams')).toBeTruthy();
    });
    expect(screen.getByText('representative')).toBeTruthy();
  });

  it('renders QR at minimum 250x250 size', async () => {
    mockApiClient.mockResolvedValueOnce({
      traveler_id: 't1',
      full_name: 'Test',
      role_type: 'traveler',
      qr_token: 'QR-TOK',
      group_ids: [],
    });

    renderQr();

    await waitFor(() => {
      const svg = screen.getByTestId('qr-svg');
      expect(Number(svg.getAttribute('width'))).toBeGreaterThanOrEqual(250);
      expect(Number(svg.getAttribute('height'))).toBeGreaterThanOrEqual(250);
    });
  });

  it('falls back to cached QR token when API fails', async () => {
    const db = makeDb();
    db.get.mockImplementation((store: string) => {
      if (store === 'qrToken') return Promise.resolve({ token_value: 'CACHED-TOKEN', traveler_name: 'Cached User' });
      if (store === 'profile') return Promise.resolve({ full_name: 'Cached User', role_type: 'traveler', group_ids: [] });
      return Promise.resolve(null);
    });
    mockGetDb.mockResolvedValue(db);
    mockApiClient.mockRejectedValueOnce(new Error('offline'));

    renderQr();

    await waitFor(() => {
      const svg = screen.getByTestId('qr-svg');
      expect(svg.getAttribute('data-value')).toBe('CACHED-TOKEN');
    });
  });
});
