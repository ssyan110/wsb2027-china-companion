/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminNotifications from './AdminNotifications';

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

describe('AdminNotifications', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders compose form with all fields', () => {
    render(<MemoryRouter><AdminNotifications /></MemoryRouter>);

    expect(screen.getByText('Publish Notification')).toBeTruthy();
    expect(screen.getByLabelText('Notification title')).toBeTruthy();
    expect(screen.getByLabelText('Notification body')).toBeTruthy();
    expect(screen.getByLabelText('Target type')).toBeTruthy();
    expect(screen.getByTestId('publish-btn')).toBeTruthy();
  });

  it('publishes notification successfully', async () => {
    mockApi.mockResolvedValueOnce({});

    render(<MemoryRouter><AdminNotifications /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Notification title'), { target: { value: 'Bus Update' } });
    fireEvent.change(screen.getByLabelText('Notification body'), { target: { value: 'Bus 3 delayed 10 min' } });
    fireEvent.click(screen.getByTestId('publish-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Notification published/)).toBeTruthy();
    });
  });

  it('shows validation error when fields empty', async () => {
    render(<MemoryRouter><AdminNotifications /></MemoryRouter>);

    fireEvent.click(screen.getByTestId('publish-btn'));

    await waitFor(() => {
      expect(screen.getByText('Title and body are required')).toBeTruthy();
    });
  });
});
