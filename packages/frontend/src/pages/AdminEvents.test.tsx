/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminEvents from './AdminEvents';

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

describe('AdminEvents', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders events table', async () => {
    mockApi.mockResolvedValueOnce({
      events: [{ event_id: 'e1', name: 'Gala Dinner', event_type: 'meal', date: '2027-06-15', start_time: '2027-06-15T18:00:00Z', end_time: null, location: 'Grand Hall', description: null }],
    });

    render(<MemoryRouter><AdminEvents /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Gala Dinner')).toBeTruthy();
    });
    expect(screen.getByText('meal')).toBeTruthy();
    expect(screen.getByText('Grand Hall')).toBeTruthy();
  });

  it('shows event form with eligibility rules', async () => {
    mockApi.mockResolvedValueOnce({ events: [] });

    render(<MemoryRouter><AdminEvents /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('+ Add Event')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('+ Add Event'));
    expect(screen.getByTestId('event-form')).toBeTruthy();
    expect(screen.getByText('Eligibility Rules')).toBeTruthy();
  });
});
