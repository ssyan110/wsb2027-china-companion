import { describe, it, expect } from 'vitest';
import {
  ALLOWED_SORT_COLUMNS,
  validateSortColumn,
  sanitizeSortOrder,
  computePagination,
} from '../query-validators.js';

// ─── ALLOWED_SORT_COLUMNS ────────────────────────────────────

describe('ALLOWED_SORT_COLUMNS', () => {
  it('contains the expected column names', () => {
    const expected = [
      'traveler_id',
      'booking_id',
      'full_name_raw',
      'full_name_normalized',
      'email_primary',
      'role_type',
      'access_status',
      'created_at',
      'updated_at',
      'first_name',
      'last_name',
      'age',
      'checkin_status',
      'invitee_type',
      'pax_type',
      'vip_tag',
      'internal_id',
      'agent_code',
    ];
    expect(ALLOWED_SORT_COLUMNS).toEqual(expected);
  });
});

// ─── validateSortColumn ──────────────────────────────────────

describe('validateSortColumn', () => {
  it('returns true for each allowed column', () => {
    for (const col of ALLOWED_SORT_COLUMNS) {
      expect(validateSortColumn(col)).toBe(true);
    }
  });

  it('returns false for an unknown column', () => {
    expect(validateSortColumn('nonexistent')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(validateSortColumn('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(validateSortColumn('Created_At')).toBe(false);
    expect(validateSortColumn('CREATED_AT')).toBe(false);
  });

  it('returns false for SQL injection attempts', () => {
    expect(validateSortColumn('created_at; DROP TABLE travelers')).toBe(false);
  });
});

// ─── sanitizeSortOrder ───────────────────────────────────────

describe('sanitizeSortOrder', () => {
  it('returns "asc" for "asc"', () => {
    expect(sanitizeSortOrder('asc')).toBe('asc');
  });

  it('returns "desc" for "desc"', () => {
    expect(sanitizeSortOrder('desc')).toBe('desc');
  });

  it('defaults to "desc" for undefined', () => {
    expect(sanitizeSortOrder(undefined)).toBe('desc');
  });

  it('defaults to "desc" for invalid strings', () => {
    expect(sanitizeSortOrder('ASC')).toBe('desc');
    expect(sanitizeSortOrder('ascending')).toBe('desc');
    expect(sanitizeSortOrder('')).toBe('desc');
  });
});

// ─── computePagination ───────────────────────────────────────

describe('computePagination', () => {
  it('uses defaults when no params provided', () => {
    const result = computePagination({}, 100);
    expect(result).toEqual({ page: 1, page_size: 50, total_pages: 2, offset: 0 });
  });

  it('respects provided page and page_size', () => {
    const result = computePagination({ page: 3, page_size: 25 }, 100);
    expect(result).toEqual({ page: 3, page_size: 25, total_pages: 4, offset: 50 });
  });

  it('caps page_size at 200', () => {
    const result = computePagination({ page_size: 500 }, 1000);
    expect(result.page_size).toBe(200);
    expect(result.total_pages).toBe(5);
  });

  it('defaults page to 1 when less than 1', () => {
    expect(computePagination({ page: 0 }, 100).page).toBe(1);
    expect(computePagination({ page: -5 }, 100).page).toBe(1);
  });

  it('defaults page_size to 50 when less than 1', () => {
    expect(computePagination({ page_size: 0 }, 100).page_size).toBe(50);
    expect(computePagination({ page_size: -10 }, 100).page_size).toBe(50);
  });

  it('returns total_pages = 1 when total is 0', () => {
    const result = computePagination({}, 0);
    expect(result.total_pages).toBe(1);
  });

  it('computes correct total_pages with remainder', () => {
    const result = computePagination({ page_size: 50 }, 101);
    expect(result.total_pages).toBe(3);
  });

  it('computes correct offset', () => {
    const result = computePagination({ page: 2, page_size: 25 }, 100);
    expect(result.offset).toBe(25);
  });

  it('floors fractional page and page_size values', () => {
    const result = computePagination({ page: 2.7, page_size: 25.9 }, 100);
    expect(result.page).toBe(2);
    expect(result.page_size).toBe(25);
    expect(result.offset).toBe(25);
  });
});
