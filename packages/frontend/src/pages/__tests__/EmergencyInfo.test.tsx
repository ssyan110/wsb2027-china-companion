/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import EmergencyInfo from '../EmergencyInfo';

const mockGetDb = vi.fn();
vi.mock('../../lib/db', () => ({
  getDb: () => mockGetDb(),
}));

function makeDb(cachedMeta: unknown = null) {
  return {
    get: vi.fn().mockResolvedValue(cachedMeta),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

describe('EmergencyInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(makeDb());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders local emergency numbers', async () => {
    render(<EmergencyInfo />);

    await waitFor(() => {
      expect(screen.getByText('Police')).toBeTruthy();
    });
    expect(screen.getByText('110')).toBeTruthy();
    expect(screen.getByText('Fire')).toBeTruthy();
    expect(screen.getByText('119')).toBeTruthy();
    expect(screen.getByText('Ambulance')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
  });

  it('renders embassy, operations, and hospital sections', async () => {
    render(<EmergencyInfo />);

    await waitFor(() => {
      expect(screen.getByText('Embassy')).toBeTruthy();
    });
    expect(screen.getByText('U.S. Embassy Beijing')).toBeTruthy();
    expect(screen.getByText('Event Operations')).toBeTruthy();
    expect(screen.getByText('WSB Event Operations Hotline')).toBeTruthy();
    expect(screen.getByText('Hospital')).toBeTruthy();
    expect(screen.getByText('Beijing United Family Hospital')).toBeTruthy();
  });

  it('has proper ARIA labels on phone links', async () => {
    render(<EmergencyInfo />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Call Police at 110/)).toBeTruthy();
    });
    expect(screen.getByLabelText(/Call embassy/)).toBeTruthy();
    expect(screen.getByLabelText(/Call operations/)).toBeTruthy();
    expect(screen.getByLabelText(/Call hospital/)).toBeTruthy();
  });
});
