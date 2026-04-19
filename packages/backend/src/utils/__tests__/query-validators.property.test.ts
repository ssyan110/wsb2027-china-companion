import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ALLOWED_SORT_COLUMNS,
  validateSortColumn,
  computePagination,
} from '../query-validators.js';

// ─── Arbitraries ─────────────────────────────────────────────

/** Arbitrary for page >= 1 */
const arbPage = fc.integer({ min: 1, max: 10_000 });

/** Arbitrary for page_size >= 1 */
const arbPageSize = fc.integer({ min: 1, max: 10_000 });

/** Arbitrary for a non-negative total count */
const arbTotal = fc.integer({ min: 0, max: 1_000_000 });

/** Arbitrary that picks one of the allowed sort columns */
const arbAllowedColumn = fc.constantFrom(...ALLOWED_SORT_COLUMNS);

/**
 * Arbitrary for a string that is NOT in the allowed sort columns list.
 * Filters out any generated string that happens to match an allowed column.
 */
const arbDisallowedColumn = fc
  .string({ minLength: 0, maxLength: 50 })
  .filter(s => !(ALLOWED_SORT_COLUMNS as readonly string[]).includes(s));

// ─── Property 1: Pagination envelope correctness ─────────────
// **Validates: Requirements 1.3, 1.4**

describe('Feature: admin-master-list, Property 1: Pagination envelope correctness', () => {
  it('total_pages === Math.ceil(total / effective_page_size) for any valid page/page_size/total', () => {
    fc.assert(
      fc.property(arbPage, arbPageSize, arbTotal, (page, pageSize, total) => {
        const result = computePagination({ page, page_size: pageSize }, total);
        const effectivePageSize = Math.min(pageSize, 200);
        const expectedTotalPages = total > 0 ? Math.ceil(total / effectivePageSize) : 1;

        expect(result.total_pages).toBe(expectedTotalPages);
      }),
      { numRuns: 200 },
    );
  });

  it('effective_page_size === Math.min(page_size, 200) for any page_size >= 1', () => {
    fc.assert(
      fc.property(arbPageSize, arbTotal, (pageSize, total) => {
        const result = computePagination({ page_size: pageSize }, total);

        expect(result.page_size).toBe(Math.min(pageSize, 200));
      }),
      { numRuns: 200 },
    );
  });

  it('page defaults to 1 and page_size defaults to 50 when not provided', () => {
    fc.assert(
      fc.property(arbTotal, (total) => {
        const result = computePagination({}, total);

        expect(result.page).toBe(1);
        expect(result.page_size).toBe(50);
      }),
      { numRuns: 100 },
    );
  });

  it('offset === (page - 1) * effective_page_size for any valid inputs', () => {
    fc.assert(
      fc.property(arbPage, arbPageSize, arbTotal, (page, pageSize, total) => {
        const result = computePagination({ page, page_size: pageSize }, total);
        const effectivePageSize = Math.min(pageSize, 200);

        expect(result.offset).toBe((page - 1) * effectivePageSize);
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 5: Sort column validation ──────────────────────
// **Validates: Requirements 2.6, 2.7**

describe('Feature: admin-master-list, Property 5: Sort column validation', () => {
  it('validateSortColumn returns true for any string in the allowed sort columns list', () => {
    fc.assert(
      fc.property(arbAllowedColumn, (column) => {
        expect(validateSortColumn(column)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('validateSortColumn returns false for any string NOT in the allowed sort columns list', () => {
    fc.assert(
      fc.property(arbDisallowedColumn, (column) => {
        expect(validateSortColumn(column)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 7: Sort column validation accepts extended columns and rejects others ───
// **Validates: Requirements 6.5, 14.6**

describe('Feature: admin-panel, Property 7: Sort column validation accepts extended columns and rejects others', () => {
  /** The extended columns added for the admin-panel spec */
  const EXTENDED_COLUMNS = [
    'first_name',
    'last_name',
    'age',
    'checkin_status',
    'invitee_type',
    'pax_type',
    'vip_tag',
    'internal_id',
    'agent_code',
  ] as const;

  /** Arbitrary that picks one of the extended sort columns */
  const arbExtendedColumn = fc.constantFrom(...EXTENDED_COLUMNS);

  it('validateSortColumn returns true for any extended column in the allowed sort list', () => {
    fc.assert(
      fc.property(arbExtendedColumn, (column) => {
        expect(validateSortColumn(column)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('validateSortColumn returns true for any column in the full allowed sort list (existing + extended)', () => {
    fc.assert(
      fc.property(arbAllowedColumn, (column) => {
        expect(validateSortColumn(column)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('validateSortColumn returns false for any string not in the allowed sort list', () => {
    fc.assert(
      fc.property(arbDisallowedColumn, (column) => {
        expect(validateSortColumn(column)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('every extended column is present in ALLOWED_SORT_COLUMNS', () => {
    for (const col of EXTENDED_COLUMNS) {
      expect(ALLOWED_SORT_COLUMNS).toContain(col);
    }
  });
});
