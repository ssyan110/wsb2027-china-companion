import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildWhereClause } from '../master-list.service.js';
import type { ExtendedMasterListQueryParams } from '@wsb/shared';

// ─── Filter parameter definitions ────────────────────────────

/**
 * Maps each filter key to the expected SQL column reference in the WHERE condition.
 * Extended filters use `t.` prefix; group_id/hotel_id use EXISTS subqueries.
 */
const FILTER_COLUMN_MAP: Record<string, string> = {
  invitee_type: 't.invitee_type',
  pax_type: 't.pax_type',
  checkin_status: 't.checkin_status',
  vip_tag: 't.vip_tag',
  agent_code: 't.agent_code',
  role_type: 't.role_type',
  access_status: 't.access_status',
  group_id: 'group_id',
  hotel_id: 'hotel_id',
};

/** All filter keys that buildWhereClause supports (excluding search `q`) */
const ALL_FILTER_KEYS = Object.keys(FILTER_COLUMN_MAP);

// ─── Arbitraries ─────────────────────────────────────────────

/** Generates a non-empty filter value string */
const arbFilterValue = fc.stringOf(
  fc.oneof(fc.char(), fc.constant('-'), fc.constant('_')),
  { minLength: 1, maxLength: 30 },
);

/** Generates a random non-empty subset of filter keys */
const arbFilterSubset = fc
  .subarray(ALL_FILTER_KEYS, { minLength: 1, maxLength: ALL_FILTER_KEYS.length })
  .filter(arr => arr.length > 0);

/** Generates a params object with a random subset of filters, each with a non-empty value */
const arbFilterParams: fc.Arbitrary<ExtendedMasterListQueryParams> = arbFilterSubset.chain(
  (keys) =>
    fc.tuple(...keys.map(() => arbFilterValue)).map((values) => {
      const params: Record<string, string> = {};
      keys.forEach((key, i) => {
        params[key] = values[i];
      });
      return params as unknown as ExtendedMasterListQueryParams;
    }),
);

/** Extended filter keys only (the 5 new ones from the admin-panel spec) */
const EXTENDED_FILTER_KEYS = [
  'invitee_type',
  'pax_type',
  'checkin_status',
  'vip_tag',
  'agent_code',
] as const;

/** Generates a single extended filter key */
const arbSingleExtendedKey = fc.constantFrom(...EXTENDED_FILTER_KEYS);


// ─── Property 6: Multiple filters produce AND-joined WHERE conditions ────
// **Validates: Requirements 5.3**

describe('Feature: admin-panel, Property 6: Multiple filters produce AND-joined WHERE conditions', () => {
  it('conditions array length equals the number of provided filter parameters', () => {
    fc.assert(
      fc.property(arbFilterParams, (params) => {
        const { conditions } = buildWhereClause(params);

        // Count how many filter keys are actually set (non-empty)
        const providedCount = ALL_FILTER_KEYS.filter(
          (key) => (params as Record<string, unknown>)[key],
        ).length;

        expect(conditions.length).toBe(providedCount);
      }),
      { numRuns: 200 },
    );
  });

  it('each provided filter produces a condition referencing its corresponding column', () => {
    fc.assert(
      fc.property(arbFilterParams, (params) => {
        const { conditions } = buildWhereClause(params);

        const providedKeys = ALL_FILTER_KEYS.filter(
          (key) => (params as Record<string, unknown>)[key],
        );

        for (const key of providedKeys) {
          const expectedColumn = FILTER_COLUMN_MAP[key];
          const hasMatch = conditions.some((cond) => cond.includes(expectedColumn));
          expect(hasMatch).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('values array contains every provided filter value', () => {
    fc.assert(
      fc.property(arbFilterParams, (params) => {
        const { values } = buildWhereClause(params);

        const providedKeys = ALL_FILTER_KEYS.filter(
          (key) => (params as Record<string, unknown>)[key],
        );

        for (const key of providedKeys) {
          const filterValue = (params as Record<string, unknown>)[key];
          expect(values).toContain(filterValue);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('conditions array can be AND-joined into a valid composite WHERE clause', () => {
    fc.assert(
      fc.property(arbFilterParams, (params) => {
        const { conditions } = buildWhereClause(params);

        if (conditions.length > 1) {
          // Each condition is a separate string; joining with ' AND ' produces
          // a composite clause where every individual condition is present.
          const joined = conditions.join(' AND ');
          for (const cond of conditions) {
            expect(joined).toContain(cond);
          }
        }

        // No condition should contain an OR that joins *separate* filter conditions.
        // Individual conditions may contain OR internally (e.g., the search `q` clause),
        // but since we don't pass `q` in arbFilterParams, none should have top-level OR.
        for (const cond of conditions) {
          // The search clause wraps its ORs in parentheses; filter-only conditions
          // should not contain ' OR ' at all.
          expect(cond).not.toMatch(/\bOR\b/);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('empty params produce zero conditions', () => {
    const { conditions, values } = buildWhereClause({});
    expect(conditions).toEqual([]);
    expect(values).toEqual([]);
  });
});

// ─── Property 14: Filter parameter produces corresponding WHERE condition ─
// **Validates: Requirements 14.5**

describe('Feature: admin-panel, Property 14: Filter parameter produces corresponding WHERE condition', () => {
  it('a single extended filter produces exactly one condition referencing the correct column', () => {
    fc.assert(
      fc.property(arbSingleExtendedKey, arbFilterValue, (key, value) => {
        const params = { [key]: value } as unknown as ExtendedMasterListQueryParams;
        const { conditions, values } = buildWhereClause(params);

        // Exactly one condition
        expect(conditions.length).toBe(1);

        // The condition references the correct column
        const expectedColumn = FILTER_COLUMN_MAP[key];
        expect(conditions[0]).toContain(expectedColumn);

        // The values array contains the provided value
        expect(values).toContain(value);
      }),
      { numRuns: 100 },
    );
  });

  it('the condition uses a parameterized placeholder ($N) not the raw value inline', () => {
    fc.assert(
      fc.property(arbSingleExtendedKey, arbFilterValue, (key, value) => {
        const params = { [key]: value } as unknown as ExtendedMasterListQueryParams;
        const { conditions } = buildWhereClause(params);

        // The condition should contain a $N placeholder
        expect(conditions[0]).toMatch(/\$\d+/);
      }),
      { numRuns: 100 },
    );
  });

  it('values array has exactly one entry matching the provided filter value', () => {
    fc.assert(
      fc.property(arbSingleExtendedKey, arbFilterValue, (key, value) => {
        const params = { [key]: value } as unknown as ExtendedMasterListQueryParams;
        const { values } = buildWhereClause(params);

        expect(values.length).toBe(1);
        expect(values[0]).toBe(value);
      }),
      { numRuns: 100 },
    );
  });
});
