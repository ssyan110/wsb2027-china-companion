import type { Pool } from 'pg';
import type { ItineraryEvent, ItineraryResponse } from '@wsb/shared';

export interface ItineraryServiceDeps {
  db: Pool;
}

export interface TravelerNotFoundError {
  error: 'not_found';
  message: string;
}

// ─── Eligibility rule shape from event_eligibility table ─────

export interface EligibilityRule {
  group_id: string | null;
  option_id: string | null;
  hotel_id: string | null;
}

// ─── Event with eligibility rules attached ───────────────────

export interface EventWithEligibility {
  event_id: string;
  name: string;
  event_type: string;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  description: string | null;
  eligibility: EligibilityRule[];
}

// ─── Traveler eligibility context ────────────────────────────

export interface TravelerEligibility {
  group_ids: string[];
  option_ids: string[];
  hotel_id: string | null;
}

/**
 * Pure filtering function — exported for property testing.
 *
 * An event is included if:
 *   1. It has no eligibility rules (open to everyone), OR
 *   2. At least one eligibility rule matches the traveler's group_ids, option_ids, or hotel_id
 */
export function filterItinerary(
  allEvents: EventWithEligibility[],
  traveler: TravelerEligibility,
): EventWithEligibility[] {
  return allEvents.filter((event) => {
    const { eligibility } = event;
    if (eligibility.length === 0) return true;
    return eligibility.some(
      (e) =>
        (e.group_id != null && traveler.group_ids.includes(e.group_id)) ||
        (e.option_id != null && traveler.option_ids.includes(e.option_id)) ||
        (e.hotel_id != null && e.hotel_id === traveler.hotel_id),
    );
  });
}

export function createItineraryService(deps: ItineraryServiceDeps) {
  const { db } = deps;

  async function getItinerary(
    travelerId: string,
  ): Promise<ItineraryResponse | TravelerNotFoundError> {
    // 1. Verify traveler exists
    const travelerCheck = await db.query(
      `SELECT traveler_id FROM travelers WHERE traveler_id = $1`,
      [travelerId],
    );
    if (travelerCheck.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    // 2. Fetch traveler's group_ids
    const groupsResult = await db.query(
      `SELECT group_id FROM traveler_groups WHERE traveler_id = $1`,
      [travelerId],
    );
    const groupIds: string[] = groupsResult.rows.map((r: { group_id: string }) => r.group_id);

    // 3. Fetch traveler's option_ids
    const optionsResult = await db.query(
      `SELECT option_id FROM traveler_options WHERE traveler_id = $1`,
      [travelerId],
    );
    const optionIds: string[] = optionsResult.rows.map((r: { option_id: string }) => r.option_id);

    // 4. Fetch traveler's hotel_id (first assignment)
    const hotelResult = await db.query(
      `SELECT hotel_id FROM traveler_hotels WHERE traveler_id = $1 LIMIT 1`,
      [travelerId],
    );
    const hotelId: string | null =
      hotelResult.rows.length > 0 ? (hotelResult.rows[0].hotel_id as string) : null;

    // 5. Fetch all events with their eligibility rules
    const eventsResult = await db.query(
      `SELECT e.event_id, e.name, e.event_type, e.date, e.start_time, e.end_time,
              e.location, e.description
       FROM events e
       ORDER BY e.date, e.start_time`,
    );

    const eligibilityResult = await db.query(
      `SELECT event_id, group_id, hotel_id, option_id FROM event_eligibility`,
    );

    // Build eligibility map: event_id -> EligibilityRule[]
    const eligibilityMap = new Map<string, EligibilityRule[]>();
    for (const row of eligibilityResult.rows) {
      const eventId = row.event_id as string;
      if (!eligibilityMap.has(eventId)) {
        eligibilityMap.set(eventId, []);
      }
      eligibilityMap.get(eventId)!.push({
        group_id: (row.group_id as string) ?? null,
        option_id: (row.option_id as string) ?? null,
        hotel_id: (row.hotel_id as string) ?? null,
      });
    }

    // 6. Attach eligibility to events
    const allEvents: EventWithEligibility[] = eventsResult.rows.map((row) => ({
      event_id: row.event_id as string,
      name: row.name as string,
      event_type: row.event_type as string,
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
      start_time: row.start_time instanceof Date ? row.start_time.toISOString() : String(row.start_time ?? ''),
      end_time: row.end_time instanceof Date ? row.end_time.toISOString() : row.end_time != null ? String(row.end_time) : null,
      location: (row.location as string) ?? '',
      description: (row.description as string) ?? null,
      eligibility: eligibilityMap.get(row.event_id as string) ?? [],
    }));

    // 7. Apply filtering algorithm
    const filtered = filterItinerary(allEvents, {
      group_ids: groupIds,
      option_ids: optionIds,
      hotel_id: hotelId,
    });

    // 8. Map to ItineraryEvent response shape (strip eligibility)
    const events: ItineraryEvent[] = filtered.map((e) => ({
      event_id: e.event_id,
      name: e.name,
      event_type: e.event_type as ItineraryEvent['event_type'],
      date: e.date,
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location,
      description: e.description,
    }));

    return { events };
  }

  return { getItinerary };
}

export type ItineraryService = ReturnType<typeof createItineraryService>;
