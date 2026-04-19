import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  filterItinerary,
  type EventWithEligibility,
  type TravelerEligibility,
  type EligibilityRule,
} from '../itinerary.service.js';

// ─── Generators ──────────────────────────────────────────────

/** Generate a single eligibility rule with at least one non-null field */
const arbEligibilityRule: fc.Arbitrary<EligibilityRule> = fc
  .record({
    group_id: fc.option(fc.uuid(), { nil: null }),
    option_id: fc.option(fc.uuid(), { nil: null }),
    hotel_id: fc.option(fc.uuid(), { nil: null }),
  })
  .filter(
    (r) => r.group_id !== null || r.option_id !== null || r.hotel_id !== null,
  );

/** Generate an event with random eligibility rules (may be empty → open event) */
const arbEvent: fc.Arbitrary<EventWithEligibility> = fc.record({
  event_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 60 }),
  event_type: fc.constantFrom('bus', 'meal', 'activity', 'ceremony', 'transfer', 'hotel_checkin'),
  date: fc.constant('2027-06-01'),
  start_time: fc.constant('2027-06-01T09:00:00Z'),
  end_time: fc.option(fc.constant('2027-06-01T11:00:00Z'), { nil: null }),
  location: fc.string({ minLength: 1, maxLength: 60 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 120 }), { nil: null }),
  eligibility: fc.array(arbEligibilityRule, { minLength: 0, maxLength: 4 }),
});

/** Generate a traveler eligibility context */
const arbTraveler: fc.Arbitrary<TravelerEligibility> = fc.record({
  group_ids: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
  option_ids: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
  hotel_id: fc.option(fc.uuid(), { nil: null }),
});

// ─── Property Tests ──────────────────────────────────────────

/**
 * Property 14: Itinerary filtering correctness
 * Validates: Requirements 7.1, 7.2
 *
 * - Events with empty eligibility arrays are always included regardless of traveler context
 * - Events with eligibility rules are included only when at least one rule matches
 *   the traveler's group_ids, option_ids, or hotel_id
 * - The filtered result is always a subset of the input events
 */
describe('Property 14: Itinerary filtering correctness', () => {
  it('events with empty eligibility are always included', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            event_id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 40 }),
            event_type: fc.constantFrom('bus', 'meal', 'activity', 'ceremony', 'transfer', 'hotel_checkin'),
            date: fc.constant('2027-06-01'),
            start_time: fc.constant('2027-06-01T09:00:00Z'),
            end_time: fc.option(fc.constant('2027-06-01T11:00:00Z'), { nil: null }),
            location: fc.string({ minLength: 1, maxLength: 40 }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: null }),
            eligibility: fc.constant([] as EligibilityRule[]),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        arbTraveler,
        (openEvents, traveler) => {
          const result = filterItinerary(openEvents, traveler);
          // Every open event must be included
          expect(result).toHaveLength(openEvents.length);
          for (const event of openEvents) {
            expect(result.find((e) => e.event_id === event.event_id)).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with eligibility rules are included only when at least one rule matches', () => {
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 1, maxLength: 10 }),
        arbTraveler,
        (events, traveler) => {
          const result = filterItinerary(events, traveler);

          for (const event of events) {
            const inResult = result.some((e) => e.event_id === event.event_id);

            if (event.eligibility.length === 0) {
              // Open events are always included
              expect(inResult).toBe(true);
            } else {
              // Check if any rule matches
              const hasMatch = event.eligibility.some(
                (rule) =>
                  (rule.group_id !== null && traveler.group_ids.includes(rule.group_id)) ||
                  (rule.option_id !== null && traveler.option_ids.includes(rule.option_id)) ||
                  (rule.hotel_id !== null && rule.hotel_id === traveler.hotel_id),
              );
              expect(inResult).toBe(hasMatch);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('filtered result is always a subset of the input events', () => {
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 0, maxLength: 15 }),
        arbTraveler,
        (events, traveler) => {
          const result = filterItinerary(events, traveler);

          // Result length must not exceed input length
          expect(result.length).toBeLessThanOrEqual(events.length);

          // Every result event must exist in the input
          const inputIds = new Set(events.map((e) => e.event_id));
          for (const filtered of result) {
            expect(inputIds.has(filtered.event_id)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('result preserves original event order', () => {
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 0, maxLength: 15 }),
        arbTraveler,
        (events, traveler) => {
          const result = filterItinerary(events, traveler);

          // Verify order: for any two events in the result, their relative
          // order must match their order in the input
          const inputIndexMap = new Map(events.map((e, i) => [e.event_id, i]));
          for (let i = 1; i < result.length; i++) {
            const prevIdx = inputIndexMap.get(result[i - 1].event_id)!;
            const currIdx = inputIndexMap.get(result[i].event_id)!;
            expect(prevIdx).toBeLessThan(currIdx);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 15: Itinerary filter idempotence
 * Validates: Requirements 46.4
 *
 * Applying the filter twice produces the same result as applying it once:
 * filterItinerary(filterItinerary(events, traveler), traveler) === filterItinerary(events, traveler)
 */
describe('Property 15: Itinerary filter idempotence', () => {
  it('filtering twice yields the same result as filtering once', () => {
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 0, maxLength: 15 }),
        arbTraveler,
        (events, traveler) => {
          const once = filterItinerary(events, traveler);
          const twice = filterItinerary(once, traveler);

          // Same length
          expect(twice).toHaveLength(once.length);

          // Same event_ids in same order
          expect(twice.map((e) => e.event_id)).toEqual(once.map((e) => e.event_id));

          // Deep equality of all fields
          for (let i = 0; i < once.length; i++) {
            expect(twice[i]).toEqual(once[i]);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
