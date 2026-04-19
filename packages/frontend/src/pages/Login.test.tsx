/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// ─── Mocks ───────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

vi.mock('../stores/auth.store', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ login: mockLogin }),
}));

vi.mock('../lib/api', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '../lib/api';
const mockApiClient = vi.mocked(apiClient);

// ─── Helpers ─────────────────────────────────────────────────

function renderLogin(params = '') {
  mockSearchParams = new URLSearchParams(params);
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the login page with title and tabs', () => {
    renderLogin();
    expect(screen.getByText('WSB 2027 China')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /magic link/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /booking lookup/i })).toBeTruthy();
  });

  it('shows magic link tab as active by default', () => {
    renderLogin();
    const magicTab = screen.getByRole('tab', { name: /magic link/i });
    expect(magicTab.getAttribute('aria-selected')).toBe('true');
  });

  it('shows email input in magic link tab', () => {
    renderLogin();
    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeTruthy();
  });

  it('switches to booking lookup tab', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: /booking lookup/i }));
    expect(screen.getByLabelText(/booking id/i)).toBeTruthy();
    expect(screen.getByLabelText(/last name/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /look up/i })).toBeTruthy();
  });

  it('disables send button when email is empty', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /send magic link/i });
    expect(btn).toBeDisabled();
  });

  it('sends magic link request and shows success message', async () => {
    mockApiClient.mockResolvedValueOnce({ success: true });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeTruthy();
    });

    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });
  });

  it('shows error when magic link request fails', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('Network error'));
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to send magic link/i)).toBeTruthy();
    });
  });

  it('disables look up button when fields are empty', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: /booking lookup/i }));
    const btn = screen.getByRole('button', { name: /look up/i });
    expect(btn).toBeDisabled();
  });

  it('submits booking lookup and navigates on success', async () => {
    mockApiClient.mockResolvedValueOnce({
      session_token: 'tok-123',
      traveler_id: 'trav-1',
    });
    renderLogin();

    fireEvent.click(screen.getByRole('tab', { name: /booking lookup/i }));
    fireEvent.change(screen.getByLabelText(/booking id/i), {
      target: { value: 'WSB-12345' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Smith' },
    });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('tok-123', 'trav-1', 'traveler');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows error when booking lookup fails', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('API 404: Not Found'));
    renderLogin();

    fireEvent.click(screen.getByRole('tab', { name: /booking lookup/i }));
    fireEvent.change(screen.getByLabelText(/booking id/i), {
      target: { value: 'WSB-99999' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Nobody' },
    });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));

    await waitFor(() => {
      expect(screen.getByText(/booking not found/i)).toBeTruthy();
    });
  });

  it('verifies magic link token from URL and navigates on success', async () => {
    mockApiClient.mockResolvedValueOnce({
      session_token: 'sess-abc',
      traveler_id: 'trav-2',
      role_type: 'traveler',
    });

    renderLogin('token=abc123');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('sess-abc', 'trav-2', 'traveler');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows verifying state while token is being checked', () => {
    mockApiClient.mockReturnValue(new Promise(() => {})); // never resolves
    renderLogin('token=pending');
    expect(screen.getByText(/verifying your magic link/i)).toBeTruthy();
  });

  it('shows expired message for expired token', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('API 410: Gone'));
    renderLogin('token=expired-token');

    await waitFor(() => {
      expect(screen.getByText(/this magic link has expired/i)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /resend magic link/i })).toBeTruthy();
  });

  it('shows already used message for used token', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('API 409: Conflict'));
    renderLogin('token=used-token');

    await waitFor(() => {
      expect(screen.getByText(/this magic link has already been used/i)).toBeTruthy();
    });
  });

  it('shows invalid message for invalid token', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('API 400: Bad Request'));
    renderLogin('token=bad-token');

    await waitFor(() => {
      expect(screen.getByText(/this magic link is invalid/i)).toBeTruthy();
    });
  });

  it('has proper ARIA attributes on tabs', () => {
    renderLogin();
    const magicTab = screen.getByRole('tab', { name: /magic link/i });
    const bookingTab = screen.getByRole('tab', { name: /booking lookup/i });

    expect(magicTab.getAttribute('aria-controls')).toBe('panel-magic-link');
    expect(bookingTab.getAttribute('aria-controls')).toBe('panel-booking-lookup');
  });

  it('has proper ARIA attributes on form inputs', () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput.getAttribute('aria-required')).toBe('true');
  });
});
