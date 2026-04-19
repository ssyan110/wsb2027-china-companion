// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  ColumnVisibilityPanel,
  loadColumnVisibility,
  saveColumnVisibility,
  getDefaultColumns,
} from './ColumnVisibilityPanel';
import { useAuthStore } from '../stores/auth.store';
import { useMasterListStore } from '../stores/master-list.store';

// ─── localStorage mock ───────────────────────────────────

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ─── Helpers ──────────────────────────────────────────────

function resetStores() {
  useAuthStore.setState({
    session_token: 'tok',
    traveler_id: 'test-traveler-1',
    role: 'super_admin',
    isAuthenticated: true,
  });
  useMasterListStore.setState({
    visibleColumns: getDefaultColumns(),
  });
}

const AVAILABLE = [
  'full_name_raw',
  'email_primary',
  'booking_id',
  'role_type',
  'access_status',
  'groups',
  'hotels',
  'qr_active',
  'phone',
  'passport_name',
];

// ─── Tests ───────────────────────────────────────────────

describe('ColumnVisibilityPanel', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a toggle button', () => {
    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);
    expect(screen.getByRole('button', { name: /columns/i })).toBeDefined();
  });

  it('shows column toggles when opened', () => {
    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(AVAILABLE.length);
  });

  it('toggles a column off and persists to localStorage', () => {
    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));

    const emailCheckbox = screen.getByLabelText('Email');
    expect((emailCheckbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(emailCheckbox);
    expect((emailCheckbox as HTMLInputElement).checked).toBe(false);

    const saved = loadColumnVisibility('test-traveler-1');
    expect(saved).toBeDefined();
    expect(saved).not.toContain('email_primary');
  });

  it('toggles a column on and persists to localStorage', () => {
    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));

    const phoneCheckbox = screen.getByLabelText('Phone');
    expect((phoneCheckbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(phoneCheckbox);
    expect((phoneCheckbox as HTMLInputElement).checked).toBe(true);

    const saved = loadColumnVisibility('test-traveler-1');
    expect(saved).toContain('phone');
  });

  it('restores saved preferences from localStorage on mount', () => {
    const customColumns = ['full_name_raw', 'phone'];
    saveColumnVisibility('test-traveler-1', customColumns);

    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));

    const nameCheckbox = screen.getByLabelText('Full Name') as HTMLInputElement;
    const phoneCheckbox = screen.getByLabelText('Phone') as HTMLInputElement;
    const emailCheckbox = screen.getByLabelText('Email') as HTMLInputElement;

    expect(nameCheckbox.checked).toBe(true);
    expect(phoneCheckbox.checked).toBe(true);
    expect(emailCheckbox.checked).toBe(false);
  });

  it('uses default columns when no saved preferences exist', () => {
    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);

    const storeState = useMasterListStore.getState();
    const defaults = getDefaultColumns().filter((c) => AVAILABLE.includes(c));
    expect(storeState.visibleColumns).toEqual(defaults);
  });

  it('filters saved columns to only available columns', () => {
    saveColumnVisibility('test-traveler-1', ['full_name_raw', 'guardian_id']);

    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);

    const storeState = useMasterListStore.getState();
    expect(storeState.visibleColumns).toContain('full_name_raw');
    expect(storeState.visibleColumns).not.toContain('guardian_id');
  });

  it('has correct aria-expanded attribute on toggle button', () => {
    render(<ColumnVisibilityPanel availableColumns={AVAILABLE} />);
    const btn = screen.getByRole('button', { name: /columns/i });

    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('loadColumnVisibility', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns null when no data is stored', () => {
    expect(loadColumnVisibility('no-such-id')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    store['master-list-columns-bad'] = '{not json';
    expect(loadColumnVisibility('bad')).toBeNull();
  });

  it('returns null for non-array JSON', () => {
    store['master-list-columns-obj'] = JSON.stringify({ a: 1 });
    expect(loadColumnVisibility('obj')).toBeNull();
  });

  it('returns the array for valid stored data', () => {
    const cols = ['a', 'b'];
    store['master-list-columns-ok'] = JSON.stringify(cols);
    expect(loadColumnVisibility('ok')).toEqual(cols);
  });
});

describe('saveColumnVisibility', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('writes JSON to localStorage with correct key', () => {
    saveColumnVisibility('user-1', ['x', 'y']);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'master-list-columns-user-1',
      JSON.stringify(['x', 'y']),
    );
  });
});

describe('getDefaultColumns', () => {
  it('returns the expected default column set', () => {
    expect(getDefaultColumns()).toEqual([
      'full_name_raw',
      'email_primary',
      'booking_id',
      'role_type',
      'access_status',
      'groups',
      'hotels',
      'qr_active',
    ]);
  });

  it('returns a new array each time (no mutation risk)', () => {
    const a = getDefaultColumns();
    const b = getDefaultColumns();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
