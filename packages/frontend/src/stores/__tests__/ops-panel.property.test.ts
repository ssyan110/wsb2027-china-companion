/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useOpsPanelStore, countActiveFilters } from '../ops-panel.store';
import type { OpsFilters } from '../ops-panel.store';

// ─── Generators ──────────────────────────────────────────────

/** Arbitrary for a non-empty search string */
const arbSearchString = fc.string({ minLength: 1, maxLength: 100 });

/** Arbitrary for a page number > 1 (so we can verify reset to 1) */
const arbPageAboveOne = fc.integer({ min: 2, max: 500 });

/** Arbitrary for OpsFilters filter keys */
const opsFilterKeys = [
  'group_id',
  'sub_group_id',
  'hotel_id',
  'invitee_type',
  'pax_type',
  'checkin_status',
  'vip_tag',
  'role_type',
  'access_status',
] as const;

const arbFilterKey = fc.constantFrom(...opsFilterKeys);

/** Arbitrary for a non-empty filter value */
const arbFilterValue = fc.string({ minLength: 1, maxLength: 50 });

/** Arbitrary for an OpsFilters object with random subset of keys populated */
const arbOpsFilters: fc.Arbitrary<OpsFilters> = fc
  .record({
    group_id: fc.option(arbFilterValue, { nil: undefined }),
    sub_group_id: fc.option(arbFilterValue, { nil: undefined }),
    hotel_id: fc.option(arbFilterValue, { nil: undefined }),
    invitee_type: fc.option(arbFilterValue, { nil: undefined }),
    pax_type: fc.option(arbFilterValue, { nil: undefined }),
    checkin_status: fc.option(arbFilterValue, { nil: undefined }),
    vip_tag: fc.option(arbFilterValue, { nil: undefined }),
    role_type: fc.option(arbFilterValue, { nil: undefined }),
    access_status: fc.option(arbFilterValue, { nil: undefined }),
  })
  .map((rec) => {
    // Remove undefined keys to match real usage patterns
    const filters: OpsFilters = {};
    for (const [k, v] of Object.entries(rec)) {
      if (v !== undefined) {
        (filters as Record<string, string>)[k] = v;
      }
    }
    return filters;
  });

/** Sortable columns from the design doc */
const sortableColumns = [
  'first_name',
  'last_name',
  'age',
  'checkin_status',
  'invitee_type',
  'pax_type',
  'vip_tag',
  'internal_id',
  'agent_code',
  'created_at',
  'updated_at',
  'full_name_raw',
  'booking_id',
  'email_primary',
];

const arbSortableColumn = fc.constantFrom(...sortableColumns);

// ─── Property 4: Search or filter change resets page to 1 ───

/**
 * Feature: admin-panel, Property 4: Search or filter change resets page to 1
 *
 * For any search string or filter key-value change applied to the ops panel
 * store, the page state should be reset to 1 regardless of what page was
 * previously active.
 *
 * **Validates: Requirements 4.3, 5.2**
 */
describe('Property 4: Search or filter change resets page to 1', () => {
  beforeEach(() => {
    useOpsPanelStore.setState({
      page: 1,
      search: '',
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  });

  it('setSearch resets page to 1 for any search string from any page', () => {
    fc.assert(
      fc.property(arbPageAboveOne, arbSearchString, (startPage, searchTerm) => {
        useOpsPanelStore.setState({ page: startPage });
        expect(useOpsPanelStore.getState().page).toBe(startPage);

        useOpsPanelStore.getState().setSearch(searchTerm);

        expect(useOpsPanelStore.getState().page).toBe(1);
        expect(useOpsPanelStore.getState().search).toBe(searchTerm);
      }),
      { numRuns: 100 },
    );
  });

  it('setFilter resets page to 1 for any filter key-value from any page', () => {
    fc.assert(
      fc.property(arbPageAboveOne, arbFilterKey, arbFilterValue, (startPage, key, value) => {
        useOpsPanelStore.setState({ page: startPage });
        expect(useOpsPanelStore.getState().page).toBe(startPage);

        useOpsPanelStore.getState().setFilter(key, value);

        expect(useOpsPanelStore.getState().page).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('clearFilters resets page to 1 from any page', () => {
    fc.assert(
      fc.property(arbPageAboveOne, arbOpsFilters, (startPage, filters) => {
        useOpsPanelStore.setState({ page: startPage, filters });

        useOpsPanelStore.getState().clearFilters();

        expect(useOpsPanelStore.getState().page).toBe(1);
        expect(useOpsPanelStore.getState().filters).toEqual({});
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Active filter count equals non-empty filter values ──

/**
 * Feature: admin-panel, Property 5: Active filter count equals non-empty filter values
 *
 * For any combination of filter values in the OpsFilters object, the computed
 * active filter count should equal the number of filter keys that have a
 * non-empty, non-undefined value.
 *
 * **Validates: Requirements 5.4**
 */
describe('Property 5: Active filter count equals non-empty filter values', () => {
  it('countActiveFilters equals the number of non-empty, non-undefined values', () => {
    fc.assert(
      fc.property(arbOpsFilters, (filters) => {
        const count = countActiveFilters(filters);
        const expected = Object.values(filters).filter(
          (v) => v !== undefined && v !== '',
        ).length;
        expect(count).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('countActiveFilters returns 0 for an empty filters object', () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it('countActiveFilters handles filters with empty string values correctly', () => {
    /** Generate filters where some keys have empty strings */
    const arbFiltersWithEmpties = fc
      .record({
        group_id: fc.constantFrom('', 'some-id', undefined),
        invitee_type: fc.constantFrom('', 'invitee', undefined),
        pax_type: fc.constantFrom('', 'adult', undefined),
        checkin_status: fc.constantFrom('', 'pending', undefined),
        vip_tag: fc.constantFrom('', 'vip', undefined),
      })
      .map((rec) => {
        const filters: OpsFilters = {};
        for (const [k, v] of Object.entries(rec)) {
          if (v !== undefined) {
            (filters as Record<string, string>)[k] = v;
          }
        }
        return filters;
      });

    fc.assert(
      fc.property(arbFiltersWithEmpties, (filters) => {
        const count = countActiveFilters(filters);
        const expected = Object.values(filters).filter(
          (v) => v !== undefined && v !== '',
        ).length;
        expect(count).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Sort direction toggles on repeated column click ─────

/**
 * Feature: admin-panel, Property 8: Sort direction toggles on repeated column click
 *
 * For any sortable column, if the current sortBy matches that column and
 * sortOrder is 'asc', calling setSort(column) should change sortOrder to 'desc'.
 * If sortOrder is 'desc', it should change to 'asc'. If sortBy does not match
 * the column, it should set sortBy to the column and sortOrder to 'asc'.
 *
 * **Validates: Requirements 6.2**
 */
describe('Property 8: Sort direction toggles on repeated column click', () => {
  beforeEach(() => {
    useOpsPanelStore.setState({
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  });

  it('toggles asc to desc when clicking the same column', () => {
    fc.assert(
      fc.property(arbSortableColumn, (column) => {
        useOpsPanelStore.setState({ sortBy: column, sortOrder: 'asc' });

        useOpsPanelStore.getState().setSort(column);

        expect(useOpsPanelStore.getState().sortBy).toBe(column);
        expect(useOpsPanelStore.getState().sortOrder).toBe('desc');
      }),
      { numRuns: 100 },
    );
  });

  it('toggles desc to asc when clicking the same column', () => {
    fc.assert(
      fc.property(arbSortableColumn, (column) => {
        useOpsPanelStore.setState({ sortBy: column, sortOrder: 'desc' });

        useOpsPanelStore.getState().setSort(column);

        expect(useOpsPanelStore.getState().sortBy).toBe(column);
        expect(useOpsPanelStore.getState().sortOrder).toBe('asc');
      }),
      { numRuns: 100 },
    );
  });

  it('sets sortBy to new column and sortOrder to asc when clicking a different column', () => {
    fc.assert(
      fc.property(
        arbSortableColumn,
        arbSortableColumn,
        fc.constantFrom('asc' as const, 'desc' as const),
        (currentColumn, newColumn, currentOrder) => {
          fc.pre(currentColumn !== newColumn);

          useOpsPanelStore.setState({ sortBy: currentColumn, sortOrder: currentOrder });

          useOpsPanelStore.getState().setSort(newColumn);

          expect(useOpsPanelStore.getState().sortBy).toBe(newColumn);
          expect(useOpsPanelStore.getState().sortOrder).toBe('asc');
        },
      ),
      { numRuns: 100 },
    );
  });
});
