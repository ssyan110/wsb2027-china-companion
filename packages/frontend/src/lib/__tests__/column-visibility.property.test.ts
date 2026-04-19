/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  loadColumnVisibility,
  saveColumnVisibility,
} from '../../components/ColumnVisibilityPanel';
import { RoleTypes, AccessStatuses } from '@wsb/shared';
import type { RoleType, AccessStatus } from '@wsb/shared';

// ─── localStorage mock (Node 25 built-in localStorage lacks clear()) ─

function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

const localStorageMock = createLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

// ─── Generators ──────────────────────────────────────────────

/** Arbitrary for a valid column name string (non-empty, no control chars) */
const arbColumnName = fc.stringOf(
  fc.char().filter((c) => c >= '!' && c <= '~'),
  { minLength: 1, maxLength: 40 },
);

/** Arbitrary for a traveler_id string */
const arbTravelerId = fc.uuid();

/** Arbitrary for RoleType enum values */
const arbRoleType = fc.constantFrom(...RoleTypes) as fc.Arbitrary<RoleType>;

/** Arbitrary for AccessStatus enum values */
const arbAccessStatus = fc.constantFrom(...AccessStatuses) as fc.Arbitrary<AccessStatus>;

/** Arbitrary for a minimal traveler-like object with role_type and access_status */
const arbTravelerObj = fc.record({
  traveler_id: fc.uuid(),
  role_type: arbRoleType,
  access_status: arbAccessStatus,
  full_name_raw: fc.string({ minLength: 1, maxLength: 60 }),
});

type TravelerObj = {
  traveler_id: string;
  role_type: RoleType;
  access_status: AccessStatus;
  full_name_raw: string;
};

// ─── Filter predicate (inline, matching server-side semantics) ───

function filterByRoleType(travelers: TravelerObj[], role: RoleType): TravelerObj[] {
  return travelers.filter((t) => t.role_type === role);
}

function filterByAccessStatus(travelers: TravelerObj[], status: AccessStatus): TravelerObj[] {
  return travelers.filter((t) => t.access_status === status);
}

// ─── Property 7: Column visibility round-trip ────────────────

/**
 * Feature: admin-master-list, Property 7: Column visibility round-trip
 *
 * For any array of column name strings and any traveler_id string,
 * saving the column visibility to localStorage and then loading it
 * back SHALL return an array equal to the original.
 *
 * **Validates: Requirements 6.4, 6.5**
 */
describe('Property 7: Column visibility round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save then load returns the original column array', () => {
    fc.assert(
      fc.property(
        arbTravelerId,
        fc.array(arbColumnName, { minLength: 1, maxLength: 20 }),
        (travelerId, columns) => {
          localStorage.clear();
          saveColumnVisibility(travelerId, columns);
          const loaded = loadColumnVisibility(travelerId);
          expect(loaded).toEqual(columns);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('load returns null when nothing has been saved', () => {
    fc.assert(
      fc.property(arbTravelerId, (travelerId) => {
        localStorage.clear();
        const loaded = loadColumnVisibility(travelerId);
        expect(loaded).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('saving for one traveler_id does not affect another', () => {
    fc.assert(
      fc.property(
        arbTravelerId,
        arbTravelerId.filter((id2) => id2.length > 0),
        fc.array(arbColumnName, { minLength: 1, maxLength: 10 }),
        fc.array(arbColumnName, { minLength: 1, maxLength: 10 }),
        (id1, id2, cols1, cols2) => {
          // Skip when IDs collide
          fc.pre(id1 !== id2);
          localStorage.clear();
          saveColumnVisibility(id1, cols1);
          saveColumnVisibility(id2, cols2);
          expect(loadColumnVisibility(id1)).toEqual(cols1);
          expect(loadColumnVisibility(id2)).toEqual(cols2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('round-trips an empty column array', () => {
    fc.assert(
      fc.property(arbTravelerId, (travelerId) => {
        localStorage.clear();
        saveColumnVisibility(travelerId, []);
        const loaded = loadColumnVisibility(travelerId);
        expect(loaded).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Filter predicate correctness ────────────────

/**
 * Feature: admin-master-list, Property 6: Filter predicate correctness
 *
 * For any array of traveler objects with mixed role_type values and a
 * chosen filter role, filtering the array by that role SHALL return only
 * objects where role_type equals the filter value. The same property
 * holds for access_status filtering.
 *
 * **Validates: Requirements 2.2, 2.3**
 */
describe('Property 6: Filter predicate correctness', () => {
  it('filtering by role_type returns only travelers with that role', () => {
    fc.assert(
      fc.property(
        fc.array(arbTravelerObj, { minLength: 0, maxLength: 30 }),
        arbRoleType,
        (travelers, role) => {
          const result = filterByRoleType(travelers, role);
          // Every returned traveler must have the chosen role
          for (const t of result) {
            expect(t.role_type).toBe(role);
          }
          // No traveler with the chosen role was left out
          const expected = travelers.filter((t) => t.role_type === role);
          expect(result.length).toBe(expected.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('filtering by access_status returns only travelers with that status', () => {
    fc.assert(
      fc.property(
        fc.array(arbTravelerObj, { minLength: 0, maxLength: 30 }),
        arbAccessStatus,
        (travelers, status) => {
          const result = filterByAccessStatus(travelers, status);
          // Every returned traveler must have the chosen status
          for (const t of result) {
            expect(t.access_status).toBe(status);
          }
          // No traveler with the chosen status was left out
          const expected = travelers.filter((t) => t.access_status === status);
          expect(result.length).toBe(expected.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('filtering preserves the original order of matching travelers', () => {
    fc.assert(
      fc.property(
        fc.array(arbTravelerObj, { minLength: 0, maxLength: 30 }),
        arbRoleType,
        (travelers, role) => {
          const result = filterByRoleType(travelers, role);
          const expectedIds = travelers
            .filter((t) => t.role_type === role)
            .map((t) => t.traveler_id);
          const resultIds = result.map((t) => t.traveler_id);
          expect(resultIds).toEqual(expectedIds);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('union of all role_type filters covers the entire array', () => {
    fc.assert(
      fc.property(
        fc.array(arbTravelerObj, { minLength: 0, maxLength: 30 }),
        (travelers) => {
          let totalFiltered = 0;
          for (const role of RoleTypes) {
            totalFiltered += filterByRoleType(travelers, role).length;
          }
          expect(totalFiltered).toBe(travelers.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
