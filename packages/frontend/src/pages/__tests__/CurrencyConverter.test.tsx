/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import CurrencyConverter from '../CurrencyConverter';

const mockGetDb = vi.fn();
vi.mock('../../lib/db', () => ({
  getDb: () => mockGetDb(),
}));

// Mock fetch for exchange rate API
const originalFetch = globalThis.fetch;

function makeDb(cachedRate: unknown = null) {
  return {
    get: vi.fn().mockResolvedValue(cachedRate),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CurrencyConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no network'));
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  it('renders CNY and USD input fields', async () => {
    mockGetDb.mockResolvedValue(makeDb());
    render(<CurrencyConverter />);

    await waitFor(() => {
      expect(screen.getByLabelText('Amount in Chinese Yuan')).toBeTruthy();
    });
    expect(screen.getByLabelText('Amount in US Dollars')).toBeTruthy();
  });

  it('converts CNY to USD when typing in CNY field', async () => {
    mockGetDb.mockResolvedValue(makeDb({ rate: 7.25, fetched_at: new Date().toISOString() }));
    render(<CurrencyConverter />);

    await waitFor(() => {
      expect(screen.getByLabelText('Amount in Chinese Yuan')).toBeTruthy();
    });

    const cnyInput = screen.getByLabelText('Amount in Chinese Yuan') as HTMLInputElement;
    fireEvent.change(cnyInput, { target: { value: '725' } });

    const usdInput = screen.getByLabelText('Amount in US Dollars') as HTMLInputElement;
    expect(usdInput.value).toBe('100.00');
  });

  it('displays exchange rate information', async () => {
    mockGetDb.mockResolvedValue(makeDb({ rate: 7.25, fetched_at: '2025-06-01T00:00:00Z' }));
    render(<CurrencyConverter />);

    await waitFor(() => {
      expect(screen.getByText(/1 USD = 7.2500 CNY/)).toBeTruthy();
    });
  });
});
