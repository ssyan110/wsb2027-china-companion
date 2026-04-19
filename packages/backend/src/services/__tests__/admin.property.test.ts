import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateCsvRow, parseCsvRow } from '../admin.service.js';
import type { CsvRowInput } from '../admin.service.js';
import { normalizeName } from '../../utils/normalize-name.js';

// ─── Arbitraries ─────────────────────────────────────────────

const VALID_ROLE_TYPES = [
  'traveler', 'minor', 'representative', 'staff', 'staff_desk', 'admin', 'super_admin',
] as const;

/** Generates a non-empty name string with optional whitespace/diacritics */
const arbName = fc.stringOf(
  fc.oneof(
    fc.char16bits().filter(c => /[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(c)),
    fc.constant(' '),
  ),
  { minLength: 2, maxLength: 60 },
).filter(s => s.trim().length > 0);

/** Generates a valid email address */
const arbEmail = fc.emailAddress();

/** Generates a valid role_type */
const arbRoleType = fc.constantFrom(...VALID_ROLE_TYPES);

/** Generates a valid CsvRowInput with all required fields */
const arbValidCsvRow: fc.Arbitrary<CsvRowInput> = fc.record({
  full_name: arbName,
  email: arbEmail,
  role_type: arbRoleType,
}).chain(row => {
  // If role is 'minor', must include guardian_id
  if (row.role_type === 'minor') {
    return fc.uuid().map(gid => ({ ...row, guardian_id: gid }));
  }
  return fc.constant(row);
});

// ─── Property Tests ──────────────────────────────────────────

/**
 * Property 4: CSV parse/format round-trip
 * Validates: Requirements 46.5, 17.1
 *
 * For any valid CSV row input (with valid full_name, email, role_type),
 * validateCsvRow should return zero errors, and parseCsvRow should produce
 * a ParsedCsvRow with correct transformations.
 */
describe('Property 4: CSV parse/format round-trip', () => {
  it('valid CSV rows produce zero validation errors', () => {
    fc.assert(
      fc.property(
        arbValidCsvRow,
        fc.integer({ min: 1, max: 10000 }),
        (row, rowIndex) => {
          const errors = validateCsvRow(row, rowIndex);
          expect(errors).toEqual([]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('parseCsvRow trims full_name', () => {
    fc.assert(
      fc.property(arbValidCsvRow, (row) => {
        const parsed = parseCsvRow(row);
        expect(parsed.full_name).toBe((row.full_name ?? '').trim());
      }),
      { numRuns: 200 },
    );
  });

  it('parseCsvRow trims and lowercases email', () => {
    fc.assert(
      fc.property(arbValidCsvRow, (row) => {
        const parsed = parseCsvRow(row);
        expect(parsed.email).toBe((row.email ?? '').trim().toLowerCase());
      }),
      { numRuns: 200 },
    );
  });

  it('parseCsvRow sets normalized_name to normalizeName(full_name)', () => {
    fc.assert(
      fc.property(arbValidCsvRow, (row) => {
        const parsed = parseCsvRow(row);
        const expected = normalizeName((row.full_name ?? '').trim());
        expect(parsed.normalized_name).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it('parseCsvRow generates a non-empty qr_token', () => {
    fc.assert(
      fc.property(arbValidCsvRow, (row) => {
        const parsed = parseCsvRow(row);
        expect(parsed.qr_token).toBeTruthy();
        expect(parsed.qr_token.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it('parseCsvRow generates a 64-char hex token_hash (SHA-256)', () => {
    fc.assert(
      fc.property(arbValidCsvRow, (row) => {
        const parsed = parseCsvRow(row);
        expect(parsed.token_hash).toMatch(/^[0-9a-f]{64}$/);
      }),
      { numRuns: 200 },
    );
  });

  it('invalid CSV rows (missing required fields) produce at least one error', () => {
    // Generate rows missing at least one required field
    const arbInvalidRow: fc.Arbitrary<CsvRowInput> = fc.oneof(
      // Missing full_name
      fc.record({
        email: arbEmail,
        role_type: arbRoleType,
      }).map(r => r as CsvRowInput),
      // Missing email
      fc.record({
        full_name: arbName,
        role_type: arbRoleType,
      }).map(r => r as CsvRowInput),
      // Missing role_type
      fc.record({
        full_name: arbName,
        email: arbEmail,
      }).map(r => r as CsvRowInput),
      // All fields empty/missing
      fc.constant({} as CsvRowInput),
    );

    fc.assert(
      fc.property(
        arbInvalidRow,
        fc.integer({ min: 1, max: 10000 }),
        (row, rowIndex) => {
          const errors = validateCsvRow(row, rowIndex);
          expect(errors.length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 200 },
    );
  });
});
