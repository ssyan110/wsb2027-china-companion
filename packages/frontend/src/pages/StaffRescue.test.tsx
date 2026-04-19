/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffRescue from './StaffRescue';

// Mock dependencies
vi.mock('../lib/api', () => ({
  apiClient: vi.fn().mockResolvedValue({ candidates: [] }),
}));

function renderRescue() {
  return render(
    <MemoryRouter>
      <StaffRescue />
    </MemoryRouter>,
  );
}

describe('StaffRescue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the rescue console with search bar and type toggle', () => {
    renderRescue();
    expect(screen.getByTestId('staff-rescue')).toBeTruthy();
    expect(screen.getByText('Staff Rescue Console')).toBeTruthy();
    expect(screen.getByLabelText('Search by name')).toBeTruthy();
    expect(screen.getByLabelText('Search by email')).toBeTruthy();
  });

  it('has a search input and search button', () => {
    renderRescue();
    expect(screen.getByLabelText('Search name input')).toBeTruthy();
    expect(screen.getByLabelText('Search')).toBeTruthy();
  });

  it('toggles search type between name and email', () => {
    renderRescue();
    const emailBtn = screen.getByLabelText('Search by email');
    fireEvent.click(emailBtn);
    expect(screen.getByPlaceholderText('Search by email…')).toBeTruthy();

    const nameBtn = screen.getByLabelText('Search by name');
    fireEvent.click(nameBtn);
    expect(screen.getByPlaceholderText('Search by name…')).toBeTruthy();
  });
});
