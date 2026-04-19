/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDispatch from './AdminDispatch';

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

describe('AdminDispatch', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders dispatch form and triggers auto-dispatch', async () => {
    render(<MemoryRouter><AdminDispatch /></MemoryRouter>);

    expect(screen.getByText('Bus Dispatch')).toBeTruthy();
    expect(screen.getByLabelText('Event ID')).toBeTruthy();

    mockApi.mockResolvedValueOnce({
      proposed_assignments: [
        { traveler_id: 't1', bus_id: 'b1', bus_number: 'Bus 01' },
        { traveler_id: 't2', bus_id: 'b1', bus_number: 'Bus 01' },
      ],
    });

    fireEvent.change(screen.getByLabelText('Event ID'), { target: { value: 'evt-1' } });
    fireEvent.click(screen.getByText('🚌 Auto-Dispatch'));

    await waitFor(() => {
      expect(screen.getAllByText('Bus 01').length).toBe(2);
    });
    expect(screen.getByText(/2 traveler\(s\) assigned/)).toBeTruthy();
    expect(screen.getByTestId('commit-btn')).toBeTruthy();
  });

  it('shows error when event ID is empty', async () => {
    render(<MemoryRouter><AdminDispatch /></MemoryRouter>);

    fireEvent.click(screen.getByText('🚌 Auto-Dispatch'));

    await waitFor(() => {
      expect(screen.getByText('Please enter an event ID')).toBeTruthy();
    });
  });
});
