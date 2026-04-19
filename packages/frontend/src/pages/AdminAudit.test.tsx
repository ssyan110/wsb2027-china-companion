/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminAudit from './AdminAudit';

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

const sampleEntries = [
  {
    audit_id: 'a1', actor_id: 'staff-1', actor_role: 'admin', action_type: 'import',
    entity_type: 'traveler', entity_id: 't1', details: { rows: 50 }, created_at: '2027-06-15T10:00:00Z',
  },
];

describe('AdminAudit', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders audit log with entries', async () => {
    mockApi.mockResolvedValueOnce({ entries: sampleEntries, total: 1, page: 1, page_size: 25 });

    render(<MemoryRouter><AdminAudit /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('staff-1')).toBeTruthy();
    });
    expect(screen.getByText('import')).toBeTruthy();
    expect(screen.getByText('traveler')).toBeTruthy();
    expect(screen.getByText('1 result(s)')).toBeTruthy();
  });

  it('renders filter controls', async () => {
    mockApi.mockResolvedValueOnce({ entries: [], total: 0, page: 1, page_size: 25 });

    render(<MemoryRouter><AdminAudit /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByLabelText('Start date')).toBeTruthy();
    });
    expect(screen.getByLabelText('End date')).toBeTruthy();
    expect(screen.getByLabelText('Action type')).toBeTruthy();
    expect(screen.getByLabelText('Staff ID')).toBeTruthy();
    expect(screen.getByLabelText('Traveler ID')).toBeTruthy();
  });

  it('shows pagination controls', async () => {
    mockApi.mockResolvedValueOnce({ entries: sampleEntries, total: 50, page: 1, page_size: 25 });

    render(<MemoryRouter><AdminAudit /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeTruthy();
    });
    expect(screen.getByText('Next →')).toBeTruthy();
  });
});
