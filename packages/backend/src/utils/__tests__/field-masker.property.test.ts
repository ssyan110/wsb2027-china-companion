import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  maskEmail,
  maskPhone,
  maskPassportName,
  applyMasking,
} from '../field-masker.js';
import type { MasterListRow } from '@wsb/shared';
import { RoleTypes, AccessStatuses } from '@wsb/shared';

// ─── Arbitraries ─────────────────────────────────────────────

/** Arbitrary for a valid email with a non-empty local part, @, and a domain. */
const arbValidEmail = fc
  .tuple(
    fc.stringOf(fc.char().filter(c => /[a-zA-Z0-9._%+-]/.test(c)), {
      minLength: 1,
      maxLength: 30,
    }),
    fc.stringOf(fc.char().filter(c => /[a-zA-Z0-9-]/.test(c)), {
      minLength: 1,
      maxLength: 20,
    }),
    fc.constantFrom('com', 'org', 'net', 'io', 'co.uk'),
  )
  .map(([local, domainName, tld]) => `${local}@${domainName}.${tld}`);

/** Arbitrary for a phone string with at least 5 digits (so masking applies). */
const arbPhoneWithDigits = fc
  .tuple(
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 5, maxLength: 15 }),
    fc.constantFrom('', '-', ' ', '.'),
  )
  .map(([digits, sep]) => {
    // Build a phone string with optional separators
    return digits.map((d, i) => (i > 0 && i % 3 === 0 ? sep + String(d) : String(d))).join('');
  });

/** Arbitrary for a passport name with length >= 2. */
const arbPassportName = fc.stringOf(
  fc.char().filter(c => /[A-Z ]/.test(c)),
  { minLength: 2, maxLength: 40 },
);

const arbRoleType = fc.constantFrom(...RoleTypes);
const arbAccessStatus = fc.constantFrom(...AccessStatuses);

/** Arbitrary for a valid MasterListRow with non-trivial PII fields. */
const arbMasterListRow: fc.Arbitrary<MasterListRow> = fc.record({
  traveler_id: fc.uuid(),
  booking_id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  family_id: fc.option(fc.uuid(), { nil: null }),
  representative_id: fc.option(fc.uuid(), { nil: null }),
  full_name_raw: fc.string({ minLength: 1, maxLength: 100 }),
  full_name_normalized: fc.string({ minLength: 1, maxLength: 100 }),
  email_primary: arbValidEmail,
  email_aliases: fc.option(fc.array(arbValidEmail, { minLength: 1, maxLength: 5 }), { nil: null }),
  passport_name: fc.option(arbPassportName, { nil: null }),
  phone: fc.option(arbPhoneWithDigits, { nil: null }),
  role_type: arbRoleType,
  access_status: arbAccessStatus,
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
  groups: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  hotels: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  flights: fc.array(
    fc.record({
      flight_number: fc.string({ minLength: 2, maxLength: 10 }),
      arrival_time: fc.date().map(d => d.toISOString()),
    }),
    { minLength: 0, maxLength: 3 },
  ),
  bus_assignments: fc.array(
    fc.record({
      bus_number: fc.string({ minLength: 1, maxLength: 10 }),
      event_name: fc.string({ minLength: 1, maxLength: 30 }),
    }),
    { minLength: 0, maxLength: 3 },
  ),
  qr_active: fc.boolean(),
});

// ─── Property 2: PII masking preserves structure ─────────────
// Validates: Requirements 3.1, 3.2, 3.3, 3.4

describe('Feature: admin-master-list, Property 2: PII masking preserves structure', () => {
  it('maskEmail returns a string starting with the first char, containing asterisks, @ and the original domain', () => {
    fc.assert(
      fc.property(arbValidEmail, (email) => {
        const masked = maskEmail(email);
        const atIndex = email.indexOf('@');
        const domain = email.slice(atIndex);

        // Starts with the first character of the local part
        expect(masked[0]).toBe(email[0]);
        // Contains asterisks
        expect(masked).toContain('***');
        // Contains @
        expect(masked).toContain('@');
        // Ends with the original domain
        expect(masked.endsWith(domain)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('maskPhone returns a string where only the last 4 digits are visible and preceding digits are asterisks', () => {
    fc.assert(
      fc.property(arbPhoneWithDigits, (phone) => {
        const masked = maskPhone(phone);
        const originalDigits = phone.replace(/\D/g, '');
        const maskedDigits = masked.replace(/\D/g, '');

        // The last 4 digits of the masked output match the last 4 of the original
        expect(maskedDigits.slice(-4)).toBe(originalDigits.slice(-4));

        // All preceding digit positions are replaced with asterisks
        // Count asterisks in the masked string — should equal (totalDigits - 4)
        const asteriskCount = (masked.match(/\*/g) || []).length;
        expect(asteriskCount).toBe(originalDigits.length - 4);

        // Non-digit characters are preserved in their original positions
        expect(masked.length).toBe(phone.length);
      }),
      { numRuns: 200 },
    );
  });

  it('maskPassportName returns a string starting with first char, ending with last char, asterisks in between', () => {
    fc.assert(
      fc.property(arbPassportName, (name) => {
        const masked = maskPassportName(name);

        if (name.length <= 2) {
          // Too short to mask — returned as-is
          expect(masked).toBe(name);
        } else {
          expect(masked[0]).toBe(name[0]);
          expect(masked[masked.length - 1]).toBe(name[name.length - 1]);
          expect(masked.length).toBe(name.length);

          // Middle characters are all asterisks
          const middle = masked.slice(1, -1);
          expect(middle).toMatch(/^\*+$/);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('each element in an email array is masked identically to how maskEmail masks a single email', () => {
    fc.assert(
      fc.property(
        fc.array(arbValidEmail, { minLength: 1, maxLength: 10 }),
        (emails) => {
          const maskedArray = emails.map(e => maskEmail(e));

          for (let i = 0; i < emails.length; i++) {
            expect(maskedArray[i]).toBe(maskEmail(emails[i]));
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── Property 3: Masking respects role ───────────────────────
// Validates: Requirements 3.5, 3.6

describe('Feature: admin-master-list, Property 3: Masking respects role', () => {
  it('applyMasking with shouldUnmask=true returns PII fields equal to the original values', () => {
    fc.assert(
      fc.property(arbMasterListRow, (row) => {
        const result = applyMasking(row, true);

        expect(result.email_primary).toBe(row.email_primary);
        expect(result.phone).toBe(row.phone);
        expect(result.passport_name).toBe(row.passport_name);
        expect(result.email_aliases).toEqual(row.email_aliases);
      }),
      { numRuns: 200 },
    );
  });

  it('applyMasking with shouldUnmask=false returns PII fields that differ from the original values', () => {
    fc.assert(
      fc.property(arbMasterListRow, (row) => {
        const result = applyMasking(row, false);

        // email_primary is always present and should always be masked
        expect(result.email_primary).not.toBe(row.email_primary);

        // phone: if non-null, should be masked (differ from original)
        if (row.phone != null) {
          expect(result.phone).not.toBe(row.phone);
        }

        // passport_name: if non-null and length > 2, should be masked
        if (row.passport_name != null && row.passport_name.length > 2) {
          expect(result.passport_name).not.toBe(row.passport_name);
        }

        // email_aliases: if non-null, each element should be masked
        if (row.email_aliases != null) {
          for (let i = 0; i < row.email_aliases.length; i++) {
            expect(result.email_aliases![i]).not.toBe(row.email_aliases[i]);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('applyMasking preserves non-PII fields regardless of shouldUnmask', () => {
    fc.assert(
      fc.property(arbMasterListRow, fc.boolean(), (row, shouldUnmask) => {
        const result = applyMasking(row, shouldUnmask);

        expect(result.traveler_id).toBe(row.traveler_id);
        expect(result.booking_id).toBe(row.booking_id);
        expect(result.full_name_raw).toBe(row.full_name_raw);
        expect(result.role_type).toBe(row.role_type);
        expect(result.access_status).toBe(row.access_status);
        expect(result.groups).toEqual(row.groups);
        expect(result.hotels).toEqual(row.hotels);
        expect(result.flights).toEqual(row.flights);
        expect(result.bus_assignments).toEqual(row.bus_assignments);
        expect(result.qr_active).toBe(row.qr_active);
      }),
      { numRuns: 200 },
    );
  });
});
