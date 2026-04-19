/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminGroups from './AdminGroups';

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

describe('AdminGroups', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders groups table', async () => {
    mockApi.mockResolvedValueOnce({ groups: [{ group_id: 'g1', name: 'VIP Group', description: 'Top tier' }] });
    mockApi.mockResolvedValueOnce({ groups: [], hotels: [], buses: [] });

    render(<MemoryRouter><AdminGroups /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('VIP Group')).toBeTruthy();
    });
    expect(screen.getByText('Top tier')).toBeTruthy();
  });

  it('shows add group form', async () => {
    mockApi.mockResolvedValueOnce({ groups: [] });
    mockApi.mockResolvedValueOnce({ groups: [], hotels: [], buses: [] });

    render(<MemoryRouter><AdminGroups /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('+ Add Group')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('+ Add Group'));
    expect(screen.getByTestId('group-form')).toBeTruthy();
  });
});
