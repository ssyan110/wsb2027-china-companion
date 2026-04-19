/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FamilyWallet from './FamilyWallet';

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
    getAll: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockReturnValue({
      store: { clear: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) },
      done: Promise.resolve(),
    }),
  };
}

const FAMILY_MEMBERS = [
  { traveler_id: 't1', full_name: 'Alice Parent', role_type: 'representative', qr_token_value: 'QR-ALICE' },
  { traveler_id: 't2', full_name: 'Bob Child', role_type: 'minor', qr_token_value: 'QR-BOB' },
  { traveler_id: 't3', full_name: 'Carol Teen', role_type: 'traveler', qr_token_value: 'QR-CAROL' },
];

function renderWallet() {
  return render(
    <MemoryRouter>
      <FamilyWallet />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe('FamilyWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(makeDb());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders list of family members with names and roles', async () => {
    mockApiClient.mockResolvedValueOnce({ family_id: 'f1', members: FAMILY_MEMBERS });

    renderWallet();

    await waitFor(() => {
      expect(screen.getByText('Alice Parent')).toBeTruthy();
    });
    expect(screen.getByText('Bob Child')).toBeTruthy();
    expect(screen.getByText('Carol Teen')).toBeTruthy();
    expect(screen.getByText('representative')).toBeTruthy();
    expect(screen.getByText('minor')).toBeTruthy();
  });

  it('shows full-screen QR when member is tapped', async () => {
    mockApiClient.mockResolvedValueOnce({ family_id: 'f1', members: FAMILY_MEMBERS });

    renderWallet();

    await waitFor(() => {
      expect(screen.getByText('Alice Parent')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Show QR for Bob Child'));

    await waitFor(() => {
      const svg = screen.getByTestId('qr-svg');
      expect(svg.getAttribute('data-value')).toBe('QR-BOB');
    });
    // Bob is at index 1, so position is "2 of 3"
    expect(screen.getByText((content) => content.includes('2') && content.includes('of') && content.includes('3'))).toBeTruthy();
  });

  it('shows position indicator in QR view', async () => {
    mockApiClient.mockResolvedValueOnce({ family_id: 'f1', members: FAMILY_MEMBERS });

    renderWallet();

    await waitFor(() => {
      expect(screen.getByText('Carol Teen')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Show QR for Carol Teen'));

    await waitFor(() => {
      expect(screen.getByText('3 of 3')).toBeTruthy();
    });
  });

  it('displays initial avatar for each member', async () => {
    mockApiClient.mockResolvedValueOnce({ family_id: 'f1', members: FAMILY_MEMBERS });

    renderWallet();

    await waitFor(() => {
      expect(screen.getByText('A')).toBeTruthy(); // Alice
      expect(screen.getByText('B')).toBeTruthy(); // Bob
      expect(screen.getByText('C')).toBeTruthy(); // Carol
    });
  });
});
