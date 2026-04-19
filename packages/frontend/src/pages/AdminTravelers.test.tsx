/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminTravelers from './AdminTravelers';

vi.mock('../stores/auth.store', () => ({
  useAuthStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => selector({ session_token: 'tok', role: 'admin' }),
    { getState: () => ({ session_token: 'tok', role: 'admin' }) },
  ),
}));

vi.mock('../lib/api', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '../lib/api';
const mockApi = vi.mocked(apiClient);

const sampleTravelers = [
  { traveler_id: 't1', full_name: 'Alice Smith', email: 'alice@test.com', role_type: 'traveler', access_status: 'activated', family_id: null },
  { traveler_id: 't2', full_name: 'Bob Jones', email: 'bob@test.com', role_type: 'minor', access_status: 'linked', family_id: 'f1' },
];

describe('AdminTravelers', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders traveler table with data', async () => {
    mockApi.mockResolvedValueOnce({ travelers: sampleTravelers });

    render(<MemoryRouter><AdminTravelers /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeTruthy();
    });
    expect(screen.getByText('Bob Jones')).toBeTruthy();
    expect(screen.getByText('alice@test.com')).toBeTruthy();
  });

  it('shows add traveler form when button clicked', async () => {
    mockApi.mockResolvedValueOnce({ travelers: [] });

    render(<MemoryRouter><AdminTravelers /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('+ Add Traveler')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('+ Add Traveler'));
    expect(screen.getByTestId('traveler-form')).toBeTruthy();
    expect(screen.getByText('Add Traveler')).toBeTruthy();
  });
});
