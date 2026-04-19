import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  autoDispatchAlgorithm,
  type TravelerFlight,
  type Bus,
} from '../dispatch.service.js';

// ─── Generators ──────────────────────────────────────────────

/** Generate a valid ISO timestamp within a realistic arrival window. */
const arbArrivalTime = fc
  .integer({ min: 0, max: 24 * 60 - 1 }) // minutes in a day
  .map((minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `2027-06-01T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;
  });

/** Generate a terminal name. */
const arbTerminal = fc.constantFrom('T1', 'T2', 'T3', null);

/** Generate a traveler with optional family_id. */
function arbTraveler(familyId: string | null = null) {
  return fc.record({
    traveler_id: fc.uuid(),
    family_id: fc.constant(familyId),
    flight_id: fc.uuid(),
    arrival_time: arbArrivalTime,
    terminal: arbTerminal,
  });
}

/** Generate a set of travelers, some with families and some without. */
const arbTravelers = fc
  .record({
    familyCount: fc.integer({ min: 0, max: 3 }),
    individualCount: fc.integer({ min: 0, max: 8 }),
  })
  .chain(({ familyCount, individualCount }) => {
    // Generate family groups
    const familyArbs = Array.from({ length: familyCount }, () =>
      fc.uuid().chain((familyId) =>
        fc
          .array(arbTraveler(familyId), { minLength: 2, maxLength: 5 })
          // Ensure all family members share the same terminal and similar arrival times
          .chain((members) => {
            if (members.length === 0) return fc.constant(members);
            const terminal = members[0].terminal;
            const arrivalTime = members[0].arrival_time;
            return fc.constant(
              members.map((m) => ({ ...m, terminal, arrival_time: arrivalTime })),
            );
          }),
      ),
    );

    // Generate individual travelers (no family)
    const individualsArb = fc.array(arbTraveler(null), {
      minLength: individualCount,
      maxLength: individualCount,
    });

    return fc.tuple(...familyArbs, individualsArb).map((groups) => {
      const allTravelers: TravelerFlight[] = [];
      for (const group of groups) {
        allTravelers.push(...group);
      }
      return allTravelers;
    });
  });

/** Generate a bus with a reasonable capacity. */
const arbBus = fc.record({
  bus_id: fc.uuid(),
  bus_number: fc.integer({ min: 1, max: 99 }).map((n) => `Bus ${String(n).padStart(2, '0')}`),
  capacity: fc.integer({ min: 2, max: 50 }),
});

/** Generate a non-empty array of buses. */
const arbBuses = fc.array(arbBus, { minLength: 1, maxLength: 5 });

// ─── Property Tests ──────────────────────────────────────────


/**
 * Property 19: Dispatch family preservation invariant
 * Validates: Requirements 19.3, 47.4
 *
 * For any set of travelers with family groups and for any dispatch output,
 * all members sharing a Family_ID SHALL be assigned to the same bus_id
 * (or all unassigned if no bus fits).
 */
describe('Property 19: Dispatch family preservation invariant', () => {
  it('all members of the same family_id are assigned to the same bus_id', () => {
    fc.assert(
      fc.property(arbTravelers, arbBuses, (travelers, buses) => {
        const assignments = autoDispatchAlgorithm(travelers, buses);

        // Group assignments by family_id
        const familyBusMap = new Map<string, Set<string>>();
        for (const assignment of assignments) {
          const traveler = travelers.find(
            (t) => t.traveler_id === assignment.traveler_id,
          );
          if (traveler?.family_id) {
            if (!familyBusMap.has(traveler.family_id)) {
              familyBusMap.set(traveler.family_id, new Set());
            }
            familyBusMap.get(traveler.family_id)!.add(assignment.bus_id);
          }
        }

        // Invariant: each family is assigned to at most one bus
        for (const [familyId, busIds] of familyBusMap) {
          expect(busIds.size).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('if any family member is assigned, all family members in the input are assigned', () => {
    fc.assert(
      fc.property(arbTravelers, arbBuses, (travelers, buses) => {
        const assignments = autoDispatchAlgorithm(travelers, buses);
        const assignedIds = new Set(assignments.map((a) => a.traveler_id));

        // Group travelers by family_id
        const familyMembers = new Map<string, string[]>();
        for (const t of travelers) {
          if (t.family_id) {
            if (!familyMembers.has(t.family_id)) {
              familyMembers.set(t.family_id, []);
            }
            familyMembers.get(t.family_id)!.push(t.traveler_id);
          }
        }

        // For each family: either all members are assigned or none are
        for (const [, memberIds] of familyMembers) {
          const assignedCount = memberIds.filter((id) => assignedIds.has(id)).length;
          expect(assignedCount === 0 || assignedCount === memberIds.length).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Property 20: Dispatch capacity invariant
 * Validates: Requirements 19.2, 47.5
 *
 * For any dispatch output, the count of travelers assigned to each bus
 * SHALL not exceed that bus's capacity.
 */
describe('Property 20: Dispatch capacity invariant', () => {
  it('no bus has more travelers assigned than its capacity', () => {
    fc.assert(
      fc.property(arbTravelers, arbBuses, (travelers, buses) => {
        const assignments = autoDispatchAlgorithm(travelers, buses);

        // Count travelers per bus
        const busCounts = new Map<string, number>();
        for (const a of assignments) {
          busCounts.set(a.bus_id, (busCounts.get(a.bus_id) ?? 0) + 1);
        }

        // Invariant: no bus exceeds its capacity
        for (const [busId, count] of busCounts) {
          const bus = buses.find((b) => b.bus_id === busId);
          expect(bus).toBeDefined();
          expect(count).toBeLessThanOrEqual(bus!.capacity);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('total assignments never exceed total bus capacity', () => {
    fc.assert(
      fc.property(arbTravelers, arbBuses, (travelers, buses) => {
        const assignments = autoDispatchAlgorithm(travelers, buses);
        const totalCapacity = buses.reduce((sum, b) => sum + b.capacity, 0);

        expect(assignments.length).toBeLessThanOrEqual(totalCapacity);
      }),
      { numRuns: 200 },
    );
  });

  it('each assigned traveler_id appears at most once in the output', () => {
    fc.assert(
      fc.property(arbTravelers, arbBuses, (travelers, buses) => {
        const assignments = autoDispatchAlgorithm(travelers, buses);
        const travelerIds = assignments.map((a) => a.traveler_id);
        const uniqueIds = new Set(travelerIds);

        expect(uniqueIds.size).toBe(travelerIds.length);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Property 21: Dispatch monotonic bus count
 * Validates: Requirements 48.3
 *
 * For any valid dispatch input, adding more travelers to the input
 * SHALL not decrease the total number of buses used in the output
 * (it should stay the same or increase).
 */
describe('Property 21: Dispatch monotonic bus count', () => {
  it('adding travelers never decreases the number of buses used', () => {
    fc.assert(
      fc.property(
        arbTravelers.filter((t) => t.length > 0),
        arbBuses,
        // Generate additional travelers to add
        fc.array(arbTraveler(null), { minLength: 1, maxLength: 5 }),
        (baseTravelers, buses, extraTravelers) => {
          // Run dispatch with base travelers
          const baseAssignments = autoDispatchAlgorithm(baseTravelers, buses);
          const baseBusCount = new Set(baseAssignments.map((a) => a.bus_id)).size;

          // Run dispatch with base + extra travelers
          const allTravelers = [...baseTravelers, ...extraTravelers];
          const expandedAssignments = autoDispatchAlgorithm(allTravelers, buses);
          const expandedBusCount = new Set(expandedAssignments.map((a) => a.bus_id)).size;

          // Monotonic: more travelers should use same or more buses
          expect(expandedBusCount).toBeGreaterThanOrEqual(baseBusCount);
        },
      ),
      { numRuns: 200 },
    );
  });
});