import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { createAdminService, FIELD_TO_COLUMN } from '../admin.service.js';
import type { UpdateTravelerInput, Actor } from '../admin.service.js';

// ─── Checkin status values ───────────────────────────────────

const CHECKIN_STATUSES = ['pending', 'checked_in', 'no_show'] as const;

// ─── Distinct checkin status pair arbitrary ───────────────────

const arbDistinctCheckinPair = fc
  .tuple(
    fc.constantFrom(...CHECKIN_STATUSES),
    fc.constantFrom(...CHECKIN_STATUSES),
  )
  .filter(([a, b]) => a !== b);

// ─── Editable non-checkin fields with value generators ───────

const STRING_FIELDS = [
  'first_name', 'last_name', 'registration_type',
  'vip_tag', 'internal_id', 'agent_code',
  'dietary_notes', 'remarks', 'smd_name', 'ceo_name',
] as const;

const ENUM_FIELDS: Array<{ field: string; values: readonly string[] }> = [
  { field: 'gender', values: ['male', 'female', 'other', 'undisclosed'] },
  { field: 'invitee_type', values: ['invitee', 'guest'] },
  { field: 'pax_type', values: ['adult', 'child', 'infant'] },
];

const NUMBER_FIELDS = ['age', 'party_total', 'party_adults', 'party_children'] as const;
const BOOLEAN_FIELDS = ['dietary_vegan', 'onsite_flight_change', 'jba_repeat'] as const;

/**
 * Generates { field, column, prevValue, newValue } where prevValue !== newValue
 * for a random non-checkin editable field.
 */
const arbFieldUpdate = fc.oneof(
  // String fields: generate two distinct non-empty strings
  fc.constantFrom(...STRING_FIELDS).chain((field) =>
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.string({ minLength: 1, maxLength: 20 }),
    )
      .filter(([a, b]) => a !== b)
      .map(([prev, next]) => ({
        field,
        column: FIELD_TO_COLUMN[field],
        prevValue: prev as unknown,
        newValue: next as unknown,
      })),
  ),
  // Enum fields: generate two distinct enum values
  fc.constantFrom(...ENUM_FIELDS).chain(({ field, values }) =>
    fc.tuple(
      fc.constantFrom(...values),
      fc.constantFrom(...values),
    )
      .filter(([a, b]) => a !== b)
      .map(([prev, next]) => ({
        field,
        column: FIELD_TO_COLUMN[field],
        prevValue: prev as unknown,
        newValue: next as unknown,
      })),
  ),
  // Number fields: generate two distinct integers
  fc.constantFrom(...NUMBER_FIELDS).chain((field) =>
    fc.tuple(
      fc.integer({ min: 0, max: 200 }),
      fc.integer({ min: 0, max: 200 }),
    )
      .filter(([a, b]) => a !== b)
      .map(([prev, next]) => ({
        field,
        column: FIELD_TO_COLUMN[field],
        prevValue: prev as unknown,
        newValue: next as unknown,
      })),
  ),
  // Boolean fields: always flip
  fc.constantFrom(...BOOLEAN_FIELDS).chain((field) =>
    fc.boolean().map((prev) => ({
      field,
      column: FIELD_TO_COLUMN[field],
      prevValue: prev as unknown,
      newValue: !prev as unknown,
    })),
  ),
);

// ─── Mock helpers ────────────────────────────────────────────

interface AuditCall {
  sql: string;
  params: unknown[];
}

function createMockDbForUpdate(
  previousRow: Record<string, unknown>,
  updatedRow: Record<string, unknown>,
) {
  const auditCalls: AuditCall[] = [];

  const mockClient = {
    query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        return Promise.resolve({ rows: [previousRow] });
      }
      if (sql.includes('UPDATE travelers SET')) {
        return Promise.resolve({ rows: [updatedRow] });
      }
      if (sql.includes('INSERT INTO audit_logs')) {
        auditCalls.push({ sql, params: params ?? [] });
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    }),
    release: vi.fn(),
  };

  const db = {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(mockClient),
  } as unknown as import('pg').Pool;

  return { db, auditCalls };
}

function baseTravelerRow(travelerId: string, overrides: Record<string, unknown> = {}) {
  return {
    traveler_id: travelerId,
    booking_id: null,
    family_id: null,
    guardian_id: null,
    full_name_raw: 'Test User',
    full_name_normalized: 'test user',
    email_primary: 'test@example.com',
    role_type: 'traveler',
    access_status: 'activated',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Property 10: Check-in status change produces correct audit entry ─

/**
 * Property 10: Check-in status change produces correct audit entry
 * **Validates: Requirements 10.4, 12.3**
 *
 * For any traveler ID and any (previous_status, new_status) pair where
 * previous_status ≠ new_status, updating the checkin_status via the admin
 * service should produce an audit log entry with action_type equal to
 * 'traveler.checkin_update', entity_type equal to 'traveler', entity_id
 * equal to the traveler's UUID, and details containing both the previous
 * and new status values.
 */
describe('Feature: admin-panel, Property 10: Check-in status change produces correct audit entry', () => {
  it('checkin_status change produces audit entry with action_type traveler.checkin_update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        arbDistinctCheckinPair,
        fc.uuid(),
        fc.constantFrom('admin', 'super_admin'),
        async (travelerId, [prevStatus, newStatus], actorId, actorRole) => {
          const previousRow = baseTravelerRow(travelerId, { checkin_status: prevStatus });
          const updatedRow = baseTravelerRow(travelerId, { checkin_status: newStatus });

          const { db, auditCalls } = createMockDbForUpdate(previousRow, updatedRow);
          const actor: Actor = { id: actorId, role: actorRole };
          const service = createAdminService({ db });

          const input: UpdateTravelerInput = {
            checkin_status: newStatus as UpdateTravelerInput['checkin_status'],
          };
          await service.updateTraveler(travelerId, input, actor);

          // Exactly one audit entry for the checkin_status change
          expect(auditCalls.length).toBe(1);

          const params = auditCalls[0].params;
          // params: [actor_id, actor_role, action_type, entity_type, entity_id, details]
          expect(params[0]).toBe(actorId);
          expect(params[1]).toBe(actorRole);
          expect(params[2]).toBe('traveler.checkin_update');
          expect(params[3]).toBe('traveler');
          expect(params[4]).toBe(travelerId);

          const details = params[5] as {
            field: string;
            previous_value: unknown;
            new_value: unknown;
          };
          expect(details.field).toBe('checkin_status');
          expect(details.previous_value).toBe(prevStatus);
          expect(details.new_value).toBe(newStatus);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Field update produces audit entry with previous and new values ─

/**
 * Property 11: Field update produces audit entry with previous and new values
 * **Validates: Requirements 12.1**
 *
 * For any editable traveler field and any (previous_value, new_value) pair
 * where previous_value ≠ new_value, updating the field via the admin service
 * should produce an audit log entry with action_type equal to
 * 'traveler.field_update', entity_type equal to 'traveler', entity_id equal
 * to the traveler's UUID, and details containing the field name, previous
 * value, and new value.
 */
describe('Feature: admin-panel, Property 11: Field update produces audit entry with previous and new values', () => {
  it('field update produces audit entry with correct action_type, entity, and details', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbFieldUpdate,
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom('admin', 'super_admin'),
        async (fieldUpdate, travelerId, actorId, actorRole) => {
          const { field, column, prevValue, newValue } = fieldUpdate;

          const previousRow = baseTravelerRow(travelerId, { [column]: prevValue });
          const updatedRow = baseTravelerRow(travelerId, { [column]: newValue });

          const { db, auditCalls } = createMockDbForUpdate(previousRow, updatedRow);
          const actor: Actor = { id: actorId, role: actorRole };
          const service = createAdminService({ db });

          const input = { [field]: newValue } as unknown as UpdateTravelerInput;
          await service.updateTraveler(travelerId, input, actor);

          // Find the audit call for our specific field
          const fieldAuditCall = auditCalls.find((c) => {
            const details = c.params[5] as { field: string };
            return details.field === field;
          });
          expect(fieldAuditCall).toBeDefined();

          const params = fieldAuditCall!.params;
          expect(params[2]).toBe('traveler.field_update');
          expect(params[3]).toBe('traveler');
          expect(params[4]).toBe(travelerId);

          const details = params[5] as {
            field: string;
            previous_value: unknown;
            new_value: unknown;
          };
          expect(details.field).toBe(field);
          expect(details.previous_value).toBe(prevValue);
          expect(details.new_value).toBe(newValue);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: Every audit entry contains actor_id and actor_role ─

/**
 * Property 12: Every audit entry contains actor_id and actor_role
 * **Validates: Requirements 12.4**
 *
 * For any audit log entry created by the admin panel (field updates,
 * check-in changes), the entry should have non-null actor_id and
 * non-empty actor_role fields.
 */
describe('Feature: admin-panel, Property 12: Every audit entry contains actor_id and actor_role', () => {
  it('every audit INSERT has non-null actor_id and non-empty actor_role for field updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbFieldUpdate,
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom('admin', 'super_admin'),
        async (fieldUpdate, travelerId, actorId, actorRole) => {
          const { field, column, prevValue, newValue } = fieldUpdate;

          const previousRow = baseTravelerRow(travelerId, { [column]: prevValue });
          const updatedRow = baseTravelerRow(travelerId, { [column]: newValue });

          const { db, auditCalls } = createMockDbForUpdate(previousRow, updatedRow);
          const actor: Actor = { id: actorId, role: actorRole };
          const service = createAdminService({ db });

          const input = { [field]: newValue } as unknown as UpdateTravelerInput;
          await service.updateTraveler(travelerId, input, actor);

          expect(auditCalls.length).toBeGreaterThanOrEqual(1);

          for (const call of auditCalls) {
            const paramActorId = call.params[0] as string;
            const paramActorRole = call.params[1] as string;

            expect(paramActorId).toBeTruthy();
            expect(typeof paramActorId).toBe('string');
            expect(paramActorId.length).toBeGreaterThan(0);

            expect(paramActorRole).toBeTruthy();
            expect(typeof paramActorRole).toBe('string');
            expect(paramActorRole.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every audit INSERT has non-null actor_id and non-empty actor_role for checkin changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        arbDistinctCheckinPair,
        fc.uuid(),
        fc.constantFrom('admin', 'super_admin'),
        async (travelerId, [prevStatus, newStatus], actorId, actorRole) => {
          const previousRow = baseTravelerRow(travelerId, { checkin_status: prevStatus });
          const updatedRow = baseTravelerRow(travelerId, { checkin_status: newStatus });

          const { db, auditCalls } = createMockDbForUpdate(previousRow, updatedRow);
          const actor: Actor = { id: actorId, role: actorRole };
          const service = createAdminService({ db });

          const input: UpdateTravelerInput = {
            checkin_status: newStatus as UpdateTravelerInput['checkin_status'],
          };
          await service.updateTraveler(travelerId, input, actor);

          expect(auditCalls.length).toBeGreaterThanOrEqual(1);

          for (const call of auditCalls) {
            const paramActorId = call.params[0] as string;
            const paramActorRole = call.params[1] as string;

            expect(paramActorId).toBeTruthy();
            expect(typeof paramActorId).toBe('string');
            expect(paramActorId.length).toBeGreaterThan(0);

            expect(paramActorRole).toBeTruthy();
            expect(typeof paramActorRole).toBe('string');
            expect(paramActorRole.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
