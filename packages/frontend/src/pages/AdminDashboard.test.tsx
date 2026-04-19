/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

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

describe('AdminDashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders summary cards with stats', async () => {
    mockApi.mockResolvedValueOnce({ total_travelers: 100, activated: 80, pending: 20, families: 15, staff: 10 });
    mockApi.mockResolvedValueOnce({ scans: [] });
    mockApi.mockResolvedValueOnce({ buses: [] });

    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeTruthy();
    });
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Total Travelers')).toBeTruthy();
    expect(screen.getByText('Activated')).toBeTruthy();
  });

  it('renders navigation links to sub-screens', async () => {
    mockApi.mockResolvedValueOnce({ total_travelers: 0, activated: 0, pending: 0, families: 0, staff: 0 });
    mockApi.mockResolvedValueOnce({ scans: [] });
    mockApi.mockResolvedValueOnce({ buses: [] });

    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('👥 Travelers')).toBeTruthy();
    });
    expect(screen.getByText('📋 Groups')).toBeTruthy();
    expect(screen.getByText('📅 Events')).toBeTruthy();
    expect(screen.getByText('🚌 Dispatch')).toBeTruthy();
    expect(screen.getByText('🔔 Notifications')).toBeTruthy();
    expect(screen.getByText('📝 Audit Log')).toBeTruthy();
  });

  it('renders system health indicators', async () => {
    mockApi.mockResolvedValueOnce({ total_travelers: 50, activated: 40, pending: 10, families: 5, staff: 3 });
    mockApi.mockResolvedValueOnce({ scans: [] });
    mockApi.mockResolvedValueOnce({ buses: [] });

    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeTruthy();
    });
    expect(screen.getByText('ok')).toBeTruthy();
  });
});
