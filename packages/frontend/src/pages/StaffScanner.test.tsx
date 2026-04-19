/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffScanner from './StaffScanner';

// Mock dependencies
vi.mock('../lib/api', () => ({
  apiClient: vi.fn().mockResolvedValue({ modes: [] }),
}));

vi.mock('../lib/db', () => ({
  getDb: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    transaction: vi.fn().mockReturnValue({
      store: { put: vi.fn(), clear: vi.fn() },
      done: Promise.resolve(),
    }),
  }),
}));

vi.mock('../stores/app.store', () => ({
  useAppStore: vi.fn((selector: (s: { isOnline: boolean }) => unknown) =>
    selector({ isOnline: true }),
  ),
}));

function renderScanner() {
  return render(
    <MemoryRouter>
      <StaffScanner />
    </MemoryRouter>,
  );
}

describe('StaffScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the scanner page with viewfinder and controls', () => {
    renderScanner();
    expect(screen.getByTestId('staff-scanner')).toBeTruthy();
    expect(screen.getByLabelText('Camera viewfinder for QR scanning')).toBeTruthy();
    expect(screen.getByLabelText('QR token input')).toBeTruthy();
    expect(screen.getByLabelText('Sync manifest')).toBeTruthy();
  });

  it('displays scan counters initialized to zero', () => {
    renderScanner();
    expect(screen.getByText('Total: 0')).toBeTruthy();
    expect(screen.getByText('Pass: 0')).toBeTruthy();
    expect(screen.getByText('Fail: 0')).toBeTruthy();
  });

  it('has a batch family toggle', () => {
    renderScanner();
    expect(screen.getByLabelText('Toggle batch family mode')).toBeTruthy();
  });

  it('shows "No Mode Selected" when no scan modes loaded', () => {
    renderScanner();
    expect(screen.getByText('No Mode Selected')).toBeTruthy();
  });
});
