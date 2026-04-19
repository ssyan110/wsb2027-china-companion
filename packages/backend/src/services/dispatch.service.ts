import type { Pool } from 'pg';
import type { DispatchProposal } from '@wsb/shared';

export interface DispatchServiceDeps {
  db: Pool;
}

// ─── Types for the pure algorithm ────────────────────────────

export interface TravelerFlight {
  traveler_id: string;
  family_id: string | null;
  flight_id: string;
  arrival_time: string; // ISO timestamp
  terminal: string | null;
}

export interface Bus {
  bus_id: string;
  bus_number: string;
  capacity: number;
}

export interface ProposedAssignment {
  traveler_id: string;
  bus_id: string;
  bus_number: string;
}

// ─── Pure auto-dispatch algorithm (exported for property testing) ─

/**
 * Auto-dispatch algorithm:
 * 1. Sort flights by arrival_time DESC (reverse time-window)
 * 2. Group travelers by terminal
 * 3. Within each terminal group, cluster by 30-min arrival windows
 * 4. For each cluster:
 *    a. Identify family groups (by family_id)
 *    b. Sort families by size DESC
 *    c. Bin-pack families into buses (target 85-100% capacity)
 *    d. Individual travelers fill remaining seats
 * 5. Return proposed assignments
 */
export function autoDispatchAlgorithm(
  travelers: TravelerFlight[],
  buses: Bus[],
): ProposedAssignment[] {
  if (travelers.length === 0 || buses.length === 0) return [];

  const assignments: ProposedAssignment[] = [];
  // Track remaining capacity per bus
  const busRemaining = new Map<string, number>();
  const busNumberMap = new Map<string, string>();
  for (const bus of buses) {
    busRemaining.set(bus.bus_id, bus.capacity);
    busNumberMap.set(bus.bus_id, bus.bus_number);
  }

  // 1. Sort travelers by arrival_time DESC (latest first)
  const sorted = [...travelers].sort(
    (a, b) => new Date(b.arrival_time).getTime() - new Date(a.arrival_time).getTime(),
  );

  // 2. Group by terminal
  const terminalGroups = new Map<string, TravelerFlight[]>();
  for (const t of sorted) {
    const terminal = t.terminal ?? 'UNKNOWN';
    if (!terminalGroups.has(terminal)) {
      terminalGroups.set(terminal, []);
    }
    terminalGroups.get(terminal)!.push(t);
  }

  // Process each terminal group
  for (const [, terminalTravelers] of terminalGroups) {
    // 3. Cluster by 30-min arrival windows
    const clusters = clusterByTimeWindow(terminalTravelers, 30);

    for (const cluster of clusters) {
      // 4a. Identify family groups
      const familyMap = new Map<string, TravelerFlight[]>();
      const individuals: TravelerFlight[] = [];

      for (const t of cluster) {
        if (t.family_id) {
          if (!familyMap.has(t.family_id)) {
            familyMap.set(t.family_id, []);
          }
          familyMap.get(t.family_id)!.push(t);
        } else {
          individuals.push(t);
        }
      }

      // 4b. Sort families by size DESC
      const families = [...familyMap.entries()].sort((a, b) => b[1].length - a[1].length);

      // 4c. Bin-pack families into buses
      for (const [, familyMembers] of families) {
        const busId = findBestBus(familyMembers.length, busRemaining, buses);
        if (busId) {
          for (const member of familyMembers) {
            assignments.push({
              traveler_id: member.traveler_id,
              bus_id: busId,
              bus_number: busNumberMap.get(busId)!,
            });
          }
          busRemaining.set(busId, busRemaining.get(busId)! - familyMembers.length);
        }
        // If no bus found, family is skipped (error case per design)
      }

      // 4d. Individual travelers fill remaining seats
      for (const individual of individuals) {
        const busId = findBestBus(1, busRemaining, buses);
        if (busId) {
          assignments.push({
            traveler_id: individual.traveler_id,
            bus_id: busId,
            bus_number: busNumberMap.get(busId)!,
          });
          busRemaining.set(busId, busRemaining.get(busId)! - 1);
        }
      }
    }
  }

  return assignments;
}


/**
 * Cluster travelers into 30-minute arrival windows.
 * Travelers are assumed to already be sorted by arrival_time DESC.
 */
function clusterByTimeWindow(travelers: TravelerFlight[], windowMinutes: number): TravelerFlight[][] {
  if (travelers.length === 0) return [];

  const clusters: TravelerFlight[][] = [];
  let currentCluster: TravelerFlight[] = [travelers[0]];
  let windowStart = new Date(travelers[0].arrival_time).getTime();

  for (let i = 1; i < travelers.length; i++) {
    const arrivalMs = new Date(travelers[i].arrival_time).getTime();
    // Since sorted DESC, arrivalMs <= windowStart
    if (windowStart - arrivalMs <= windowMinutes * 60 * 1000) {
      currentCluster.push(travelers[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [travelers[i]];
      windowStart = arrivalMs;
    }
  }
  clusters.push(currentCluster);

  return clusters;
}

/**
 * Find the best bus for a group of `size` travelers.
 * Strategy: pick the bus where adding this group gets closest to
 * 85-100% fill rate, preferring buses that are already partially filled.
 * Falls back to any bus with enough remaining capacity.
 *
 * To guarantee monotonic bus count (Req 48.3), we use a deterministic
 * two-phase approach:
 *   Phase 1: Try to fit into an already-used bus (remaining < capacity)
 *   Phase 2: If no used bus fits, pick the smallest empty bus that fits
 */
function findBestBus(
  size: number,
  busRemaining: Map<string, number>,
  buses: Bus[],
): string | null {
  // Sort buses deterministically by capacity ASC, then bus_id for tie-break
  const sortedBuses = [...buses].sort((a, b) => {
    if (a.capacity !== b.capacity) return a.capacity - b.capacity;
    return a.bus_id.localeCompare(b.bus_id);
  });

  // Phase 1: prefer already-used buses (partially filled) — best fill rate
  let bestUsedId: string | null = null;
  let bestUsedScore = -Infinity;

  for (const bus of sortedBuses) {
    const remaining = busRemaining.get(bus.bus_id)!;
    if (remaining < size) continue; // doesn't fit
    if (remaining === bus.capacity) continue; // skip empty buses in phase 1

    const afterFill = bus.capacity - (remaining - size);
    const fillRate = afterFill / bus.capacity;

    let score: number;
    if (fillRate >= 0.85 && fillRate <= 1.0) {
      score = 1000 + fillRate;
    } else {
      score = fillRate;
    }
    // Tie-break: prefer higher current fill
    score += (bus.capacity - remaining) / bus.capacity * 0.01;

    if (score > bestUsedScore) {
      bestUsedScore = score;
      bestUsedId = bus.bus_id;
    }
  }

  if (bestUsedId) return bestUsedId;

  // Phase 2: pick the smallest empty bus that fits (first-fit decreasing)
  for (const bus of sortedBuses) {
    const remaining = busRemaining.get(bus.bus_id)!;
    if (remaining === bus.capacity && remaining >= size) {
      return bus.bus_id;
    }
  }

  // Phase 3: fallback — any bus with enough remaining capacity
  for (const bus of sortedBuses) {
    const remaining = busRemaining.get(bus.bus_id)!;
    if (remaining >= size) {
      return bus.bus_id;
    }
  }

  return null;
}

// ─── Service factory ─────────────────────────────────────────

export function createDispatchService(deps: DispatchServiceDeps) {
  const { db } = deps;

  /**
   * Auto-dispatch: fetch travelers with flights for the target event,
   * run the dispatch algorithm, and return proposed assignments.
   */
  async function autoDispatch(eventId: string): Promise<DispatchProposal | { error: string; message: string }> {
    // 1. Fetch all travelers with flights for the target event
    const travelersResult = await db.query(
      `SELECT DISTINCT t.traveler_id, t.family_id, f.flight_id, f.arrival_time, f.terminal
       FROM travelers t
       JOIN traveler_flights tf ON tf.traveler_id = t.traveler_id
       JOIN flights f ON f.flight_id = tf.flight_id
       ORDER BY f.arrival_time DESC`,
    );

    if (travelersResult.rows.length === 0) {
      return { error: 'no_travelers', message: 'No travelers with flight data found' };
    }

    const travelers: TravelerFlight[] = travelersResult.rows.map((row) => ({
      traveler_id: row.traveler_id as string,
      family_id: (row.family_id as string) ?? null,
      flight_id: row.flight_id as string,
      arrival_time: new Date(row.arrival_time as string).toISOString(),
      terminal: (row.terminal as string) ?? null,
    }));

    // 2. Fetch available buses for this event
    const busesResult = await db.query(
      `SELECT bus_id, bus_number, capacity FROM buses WHERE event_id = $1 ORDER BY bus_number`,
      [eventId],
    );

    if (busesResult.rows.length === 0) {
      return { error: 'no_buses', message: 'No buses configured for this event' };
    }

    const buses: Bus[] = busesResult.rows.map((row) => ({
      bus_id: row.bus_id as string,
      bus_number: row.bus_number as string,
      capacity: row.capacity as number,
    }));

    // 3. Run the dispatch algorithm
    const proposed = autoDispatchAlgorithm(travelers, buses);

    return { proposed_assignments: proposed };
  }

  /**
   * Commit dispatch: bulk insert assignments into bus_assignments table.
   */
  async function commitDispatch(
    assignments: Array<{ traveler_id: string; bus_id: string }>,
    eventId: string,
  ): Promise<{ committed: number }> {
    if (assignments.length === 0) {
      return { committed: 0 };
    }

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const a of assignments) {
      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
      values.push(a.traveler_id, a.bus_id, eventId);
      paramIndex += 3;
    }

    await db.query(
      `INSERT INTO bus_assignments (traveler_id, bus_id, event_id)
       VALUES ${placeholders.join(', ')}`,
      values,
    );

    return { committed: assignments.length };
  }

  return { autoDispatch, commitDispatch };
}

export type DispatchService = ReturnType<typeof createDispatchService>;
