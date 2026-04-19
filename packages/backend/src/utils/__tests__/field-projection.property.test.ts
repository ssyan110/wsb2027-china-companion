import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { projectFieldsByRole } from '../field-projection.js';
import type { MasterListRow } from '@wsb/shared';
import { RoleTypes, AccessStatuses } from '@wsb/shared';

// ─── Arbitraries ─────────────────────────────────────────────

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

const arbPhoneWithDigits = fc
  .tuple(
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 5, maxLength: 15 }),
    fc.constantFrom('', '-', ' ', '.'),
  )
  .map(([digits, sep]) =>
    digits.map((d, i) => (i > 0 && i % 3 === 0 ? sep + String(d) : String(d))).join(''),
  );

const arbPassportName = fc.stringOf(
  fc.char().filter(c => /[A-Z ]/.test(c)),
  { minLength: 2, maxLength: 40 },
);

const arbRoleType = fc.constantFrom(...RoleTypes);
const arbAccessStatus = fc.constantFrom(...AccessStatuses);

/**
 * Arbitrary for a MasterListRow that always includes `guardian_id` and
 * `email_aliases` so we can verify projection removes them for admin role.
 */
const arbMasterListRow: fc.Arbitrary<MasterListRow> = fc.record({
  traveler_id: fc.uuid(),
  booking_id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  family_id: fc.option(fc.uuid(), { nil: null }),
  representative_id: fc.option(fc.uuid(), { nil: null }),
  guardian_id: fc.option(fc.uuid(), { nil: null }),
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

// ─── Property 4: Field projection by role ────────────────────
// **Validates: Requirements 8.1, 8.2**

describe('Feature: admin-master-list, Property 4: Field projection by role', () => {
  it('projectFieldsByRole with admin role SHALL NOT contain email_aliases or guardian_id keys', () => {
    fc.assert(
      fc.property(arbMasterListRow, (row) => {
        const result = projectFieldsByRole(row, 'admin');

        expect(result).not.toHaveProperty('email_aliases');
        expect(result).not.toHaveProperty('guardian_id');
      }),
      { numRuns: 100 },
    );
  });

  it('projectFieldsByRole with super_admin role SHALL contain all fields present in the input row', () => {
    fc.assert(
      fc.property(arbMasterListRow, (row) => {
        const result = projectFieldsByRole(row, 'super_admin');
        const inputKeys = Object.keys(row);

        for (const key of inputKeys) {
          expect(result).toHaveProperty(key);
          expect((result as unknown as Record<string, unknown>)[key]).toEqual(
            (row as unknown as Record<string, unknown>)[key],
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
