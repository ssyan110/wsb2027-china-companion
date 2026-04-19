import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { createMasterListService } from '../master-list.service.js';
import type { RoleType, ExtendedMasterListRow, RoomAssignment, FlightDetail } from '@wsb/shared';

// ─── Helpers ─────────────────────────────────────────────────

function createMockAuditService() {
  return {
    logAuditEvent: vi.fn().mockResolvedValue({ audit_id: 'aud-1' }),
    getAuditLogs: vi.fn(),
    purgeExpiredLogs: vi.fn(),
  };
}

/**
 * The extended columns that the CSV export must include for admin role
 * (admin role excludes email_aliases and guardian_id).
 * These are the columns specified in Requirement 11.2.
 */
const REQUIRED_EXTENDED_COLUMNS = [
  'first_name', 'last_name', 'gender', 'age', 'invitee_type',
  'pax_type', 'vip_tag', 'internal_id', 'agent_code',
  'room_assignment', 'arrival_flight', 'departure_flight',
] as const;

/**
 * All columns that should appear in the CSV header for super_admin role.
 */
const ALL_CSV_COLUMNS: (keyof ExtendedMasterListRow)[] = [
  'traveler_id', 'booking_id', 'family_id', 'representative_id', 'guardian_id',
  'full_name_raw', 'full_name_normalized', 'email_primary', 'email_aliases',
  'passport_name', 'phone', 'role_type', 'access_status', 'created_at', 'updated_at',
  'first_name', 'last_name', 'gender', 'age', 'invitee_type', 'registration_type',
  'pax_type', 'vip_tag', 'internal_id', 'agent_code',
  'party_total', 'party_adults', 'party_children',
  'dietary_vegan', 'dietary_notes', 'remarks',
  'repeat_attendee', 'jba_repeat', 'checkin_status', 'onsite_flight_change',
  'smd_name', 'ceo_name', 'photo_url',
  'groups', 'hotels', 'room_assignment', 'arrival_flight', 'departure_flight',
  'event_attendance', 'flights', 'bus_assignments', 'qr_active',
];

// ─── Arbitraries ─────────────────────────────────────────────

const arbGender = fc.constantFrom('male', 'female', 'other', 'undisclosed', null) as fc.Arbitrary<ExtendedMasterListRow['gender']>;
const arbInviteeType = fc.constantFrom('invitee', 'guest', null) as fc.Arbitrary<ExtendedMasterListRow['invitee_type']>;
const arbPaxType = fc.constantFrom('adult', 'child', 'infant') as fc.Arbitrary<ExtendedMasterListRow['pax_type']>;
const arbCheckinStatus = fc.constantFrom('pending', 'checked_in', 'no_show') as fc.Arbitrary<ExtendedMasterListRow['checkin_status']>;

const arbNullableString = fc.option(fc.string({ minLength: 0, maxLength: 30 }), { nil: null });

const arbRoomAssignment: fc.Arbitrary<RoomAssignment | null> = fc.option(
  fc.record({
    room_number: arbNullableString,
    room_assignment_seq: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
    hotel_confirmation_no: arbNullableString,
    occupancy: fc.constantFrom('single', 'double', 'twin', 'triple', null) as fc.Arbitrary<RoomAssignment['occupancy']>,
    paid_room_type: arbNullableString,
    preferred_roommates: arbNullableString,
    is_paid_room: fc.boolean(),
    hotel_name: arbNullableString,
  }),
  { nil: null },
);

const arbFlightDetail: fc.Arbitrary<FlightDetail | null> = fc.option(
  fc.record({
    airline: arbNullableString,
    flight_number: fc.string({ minLength: 2, maxLength: 10 }),
    time: fc.date().map(d => d.toISOString()),
    airport: arbNullableString,
    terminal: arbNullableString,
  }),
  { nil: null },
);

/**
 * Generates a mock DB row that simulates what PostgreSQL returns.
 * The mapRow function in master-list.service.ts converts this into an ExtendedMasterListRow.
 */
const arbDbRow = fc.record({
  traveler_id: fc.uuid(),
  booking_id: arbNullableString,
  family_id: fc.option(fc.uuid(), { nil: null }),
  representative_id: fc.option(fc.uuid(), { nil: null }),
  guardian_id: fc.option(fc.uuid(), { nil: null }),
  full_name_raw: fc.string({ minLength: 1, maxLength: 50 }),
  full_name_normalized: fc.string({ minLength: 1, maxLength: 50 }),
  email_primary: fc.emailAddress(),
  email_aliases: fc.option(fc.array(fc.emailAddress(), { minLength: 0, maxLength: 2 }), { nil: null }),
  passport_name: arbNullableString,
  phone: arbNullableString,
  role_type: fc.constantFrom('traveler', 'admin', 'super_admin', 'staff') as fc.Arbitrary<RoleType>,
  access_status: fc.constantFrom('activated', 'deactivated', 'pending'),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
  first_name: arbNullableString,
  last_name: arbNullableString,
  gender: arbGender,
  age: fc.option(fc.integer({ min: 0, max: 120 }), { nil: null }),
  invitee_type: arbInviteeType,
  registration_type: arbNullableString,
  pax_type: arbPaxType,
  vip_tag: arbNullableString,
  internal_id: arbNullableString,
  agent_code: arbNullableString,
  party_total: fc.option(fc.integer({ min: 1, max: 20 }), { nil: null }),
  party_adults: fc.option(fc.integer({ min: 0, max: 20 }), { nil: null }),
  party_children: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
  dietary_vegan: fc.boolean(),
  dietary_notes: arbNullableString,
  remarks: arbNullableString,
  repeat_attendee: fc.integer({ min: 0, max: 10 }),
  jba_repeat: fc.boolean(),
  checkin_status: arbCheckinStatus,
  onsite_flight_change: fc.boolean(),
  smd_name: arbNullableString,
  ceo_name: arbNullableString,
  photo_url: arbNullableString,
  groups: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 3 }),
  hotels: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 2 }),
  room_assignment: arbRoomAssignment,
  arrival_flight: arbFlightDetail,
  departure_flight: arbFlightDetail,
  event_attendance: fc.array(
    fc.record({
      event_name: fc.string({ minLength: 1, maxLength: 20 }),
      fleet_number: arbNullableString,
      attended: fc.option(fc.boolean(), { nil: null }),
    }),
    { minLength: 0, maxLength: 3 },
  ).map(arr => JSON.stringify(arr)),
  flights: fc.array(
    fc.record({
      flight_number: fc.string({ minLength: 2, maxLength: 10 }),
      arrival_time: fc.date().map(d => d.toISOString()),
    }),
    { minLength: 0, maxLength: 2 },
  ).map(arr => JSON.stringify(arr)),
  bus_assignments: fc.array(
    fc.record({
      bus_number: fc.string({ minLength: 1, maxLength: 5 }),
      event_name: fc.string({ minLength: 1, maxLength: 20 }),
    }),
    { minLength: 0, maxLength: 2 },
  ).map(arr => JSON.stringify(arr)),
  qr_active: fc.boolean(),
});

/**
 * Helper: create a mock DB pool that returns a count row then a batch of data rows.
 */
function createMockDbForExport(rows: Record<string, unknown>[]) {
  let callIndex = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const response = callIndex === 0
        ? { rows: [{ total: rows.length }] }  // COUNT query
        : { rows };                             // data batch
      callIndex++;
      return Promise.resolve(response);
    }),
  } as unknown as import('pg').Pool;
}

/**
 * Collects all yielded strings from the async generator into a single string.
 */
async function collectCsv(gen: AsyncGenerator<string>): Promise<string> {
  let csv = '';
  for await (const chunk of gen) {
    csv += chunk;
  }
  return csv;
}

// ─── Property 13: CSV export row contains all extended fields ─
// **Validates: Requirements 11.2**

describe('Feature: admin-panel, Property 13: CSV export row contains all extended fields', () => {
  it('CSV header contains all extended schema column names', () => {
    fc.assert(
      fc.asyncProperty(arbDbRow, async (dbRow) => {
        const auditService = createMockAuditService();
        const db = createMockDbForExport([dbRow]);
        const service = createMasterListService({ db, auditService });

        const gen = service.exportCsv({}, { id: 'actor-1', role: 'super_admin' as RoleType });
        const csv = await collectCsv(gen);
        const lines = csv.split('\n').filter(l => l.length > 0);

        // First line is the header
        const header = lines[0];

        // All required extended columns must appear in the header
        for (const col of REQUIRED_EXTENDED_COLUMNS) {
          expect(header).toContain(col);
        }

        // All CSV columns must appear in the header for super_admin
        for (const col of ALL_CSV_COLUMNS) {
          expect(header).toContain(col);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('CSV data row has the same number of fields as the header', () => {
    fc.assert(
      fc.asyncProperty(arbDbRow, async (dbRow) => {
        const auditService = createMockAuditService();
        const db = createMockDbForExport([dbRow]);
        const service = createMasterListService({ db, auditService });

        const gen = service.exportCsv({}, { id: 'actor-1', role: 'super_admin' as RoleType });
        const csv = await collectCsv(gen);
        const lines = csv.split('\n').filter(l => l.length > 0);

        expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least 1 data row

        // Parse header column count (simple split since column names don't contain commas)
        const headerColumnCount = lines[0].split(',').length;

        // Data row should have the same number of comma-separated fields.
        // We need a proper CSV parse since values may contain commas inside quotes.
        const dataRow = lines[1];
        const dataFields = parseCsvLine(dataRow);

        expect(dataFields.length).toBe(headerColumnCount);
      }),
      { numRuns: 100 },
    );
  });

  it('CSV data row contains non-empty values for non-null extended fields', () => {
    fc.assert(
      fc.asyncProperty(arbDbRow, async (dbRow) => {
        const auditService = createMockAuditService();
        const db = createMockDbForExport([dbRow]);
        const service = createMasterListService({ db, auditService });

        const gen = service.exportCsv({}, { id: 'actor-1', role: 'super_admin' as RoleType });
        const csv = await collectCsv(gen);
        const lines = csv.split('\n').filter(l => l.length > 0);

        expect(lines.length).toBeGreaterThanOrEqual(2);

        const headerCols = lines[0].split(',');
        const dataFields = parseCsvLine(lines[1]);

        // Build a map of column name → value
        const rowMap: Record<string, string> = {};
        headerCols.forEach((col, i) => {
          rowMap[col] = dataFields[i] ?? '';
        });

        // For non-null, non-empty scalar extended fields, the CSV value should be non-empty.
        // An empty string source value legitimately maps to an empty CSV cell.
        const nonEmptyStr = (v: unknown) => v != null && String(v) !== '';
        if (nonEmptyStr(dbRow.first_name)) expect(rowMap['first_name']).not.toBe('');
        if (nonEmptyStr(dbRow.last_name)) expect(rowMap['last_name']).not.toBe('');
        if (nonEmptyStr(dbRow.gender)) expect(rowMap['gender']).not.toBe('');
        if (dbRow.age != null) expect(rowMap['age']).not.toBe('');
        if (nonEmptyStr(dbRow.invitee_type)) expect(rowMap['invitee_type']).not.toBe('');
        if (nonEmptyStr(dbRow.vip_tag)) expect(rowMap['vip_tag']).not.toBe('');
        if (nonEmptyStr(dbRow.internal_id)) expect(rowMap['internal_id']).not.toBe('');
        if (nonEmptyStr(dbRow.agent_code)) expect(rowMap['agent_code']).not.toBe('');

        // pax_type always has a value (defaults to 'adult')
        expect(rowMap['pax_type']).not.toBe('');

        // Room assignment: if provided, should be a non-empty JSON string
        if (dbRow.room_assignment != null) {
          expect(rowMap['room_assignment']).not.toBe('');
        }

        // Flight details: if provided, should be non-empty JSON strings
        if (dbRow.arrival_flight != null) {
          expect(rowMap['arrival_flight']).not.toBe('');
        }
        if (dbRow.departure_flight != null) {
          expect(rowMap['departure_flight']).not.toBe('');
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── CSV line parser ─────────────────────────────────────────

/**
 * Simple RFC 4180 CSV line parser that handles quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped double-quote
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  fields.push(current);
  return fields;
}
