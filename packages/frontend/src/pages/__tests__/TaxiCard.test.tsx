/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import TaxiCard from '../TaxiCard';

const mockGetDb = vi.fn();
vi.mock('../../lib/db', () => ({
  getDb: () => mockGetDb(),
}));

vi.mock('../../lib/api', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '../../lib/api';
const mockApiClient = vi.mocked(apiClient);

function makeDb(cachedTaxi: unknown = null) {
  return {
    get: vi.fn().mockResolvedValue(cachedTaxi),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TaxiCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('displays hotel name and address from API', async () => {
    mockGetDb.mockResolvedValue(makeDb());
    mockApiClient.mockResolvedValueOnce({
      hotel: {
        hotel_id: 'h1',
        name: 'Grand Beijing Hotel',
        address_en: '123 Main Street, Beijing',
        address_cn: '北京市主街123号',
      },
    });

    render(<TaxiCard />);

    await waitFor(() => {
      expect(screen.getByText('Grand Beijing Hotel')).toBeTruthy();
    });
    expect(screen.getByText('123 Main Street, Beijing')).toBeTruthy();
    expect(screen.getByText('北京市主街123号')).toBeTruthy();
  });

  it('shows no-hotel message when no hotel assigned', async () => {
    mockGetDb.mockResolvedValue(makeDb());
    mockApiClient.mockResolvedValueOnce({ hotel: null });

    render(<TaxiCard />);

    await waitFor(() => {
      expect(screen.getByText(/No hotel assignment found/)).toBeTruthy();
    });
  });

  it('uses cached data when API fails', async () => {
    const cached = {
      hotel_name_en: 'Cached Hotel',
      hotel_name_cn: '缓存酒店',
      address_en: '456 Cached St',
      address_cn: '缓存街456号',
    };
    mockGetDb.mockResolvedValue(makeDb(cached));
    mockApiClient.mockRejectedValueOnce(new Error('offline'));

    render(<TaxiCard />);

    await waitFor(() => {
      expect(screen.getByText('Cached Hotel')).toBeTruthy();
    });
    expect(screen.getByText('456 Cached St')).toBeTruthy();
  });
});
