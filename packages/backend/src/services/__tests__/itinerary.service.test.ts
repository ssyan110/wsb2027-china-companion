import { describe, it, expect, vi } from 'vitest';
import {
  createItineraryService,
  filterItinerary,
  type EventWithEligibility,
  type TravelerEligibility,
} from '../itinerary.service.js';

// ─── Mock helpers ────────────────────────────────────────────

function createMockDb(queryResponses: Array<{ rows: Record<string, unknown>[] }> = []) {
  let callIndex = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [] };
      callIndex++;
      return Promise.resolve(response);
    }),
  } as unknown as import('pg').Pool;
}

// ─── Pure filterItinerary tests ──────────────────────────────

describe('filterItinerary (pure function)', () => {
  const baseEvent: EventWithEligibility = {
    event_id: 'evt-1',
    name: 'Opening Ceremony',
    event_type: 'ceremony',
    date: '2027-06-01',
    start_time: '2027-06-01T09:00:00Z',
    end_time: '2027-06-01T11:00:00Z',
    location: 'Main Hall',
    description: 'Welcome ceremony',
    eligibility: [],
  };

  it('should include events with no eligibility rules for all travelers', () => {
    const events: EventWithEligibility[] = [
      { ...baseEvent, eligibility: [] },
    ];
    const traveler: TravelerEligibility = { group_ids: [], option_ids: [], hotel_id: null };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(1);
    expect(result[0].event_id).toBe('evt-1');
  });

  it('should include events matching traveler group_id', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [{ group_id: 'grp-a', option_id: null, hotel_id: null }],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: ['grp-a'], option_ids: [], hotel_id: null };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(1);
  });

  it('should exclude events when traveler has no matching group_id', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [{ group_id: 'grp-b', option_id: null, hotel_id: null }],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: ['grp-a'], option_ids: [], hotel_id: null };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(0);
  });

  it('should include events matching traveler option_id', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [{ group_id: null, option_id: 'opt-1', hotel_id: null }],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: [], option_ids: ['opt-1'], hotel_id: null };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(1);
  });

  it('should include events matching traveler hotel_id', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [{ group_id: null, option_id: null, hotel_id: 'htl-1' }],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: [], option_ids: [], hotel_id: 'htl-1' };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(1);
  });

  it('should exclude events when hotel_id does not match', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [{ group_id: null, option_id: null, hotel_id: 'htl-2' }],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: [], option_ids: [], hotel_id: 'htl-1' };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(0);
  });

  it('should include event if ANY eligibility rule matches (OR logic)', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [
          { group_id: 'grp-x', option_id: null, hotel_id: null },
          { group_id: null, option_id: 'opt-1', hotel_id: null },
        ],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: [], option_ids: ['opt-1'], hotel_id: null };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(1);
  });

  it('should exclude event when no eligibility rules match', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [
          { group_id: 'grp-x', option_id: null, hotel_id: null },
          { group_id: null, option_id: 'opt-99', hotel_id: null },
        ],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: ['grp-a'], option_ids: ['opt-1'], hotel_id: 'htl-1' };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(0);
  });

  it('should handle mixed events — some open, some restricted', () => {
    const events: EventWithEligibility[] = [
      { ...baseEvent, event_id: 'evt-open', eligibility: [] },
      {
        ...baseEvent,
        event_id: 'evt-restricted',
        eligibility: [{ group_id: 'grp-vip', option_id: null, hotel_id: null }],
      },
      {
        ...baseEvent,
        event_id: 'evt-hotel',
        eligibility: [{ group_id: null, option_id: null, hotel_id: 'htl-1' }],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: [], option_ids: [], hotel_id: 'htl-1' };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.event_id)).toEqual(['evt-open', 'evt-hotel']);
  });

  it('should return empty array when all events are restricted and none match', () => {
    const events: EventWithEligibility[] = [
      {
        ...baseEvent,
        eligibility: [{ group_id: 'grp-x', option_id: null, hotel_id: null }],
      },
    ];
    const traveler: TravelerEligibility = { group_ids: [], option_ids: [], hotel_id: null };

    const result = filterItinerary(events, traveler);
    expect(result).toHaveLength(0);
  });

  it('should return empty array when no events exist', () => {
    const result = filterItinerary([], { group_ids: ['grp-a'], option_ids: [], hotel_id: null });
    expect(result).toHaveLength(0);
  });
});


// ─── Integration-style tests for createItineraryService ──────

describe('ItineraryService.getItinerary', () => {
  it('should return not_found when traveler does not exist', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createItineraryService({ db });

    const result = await service.getItinerary('nonexistent-id');
    expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('should return filtered events sorted by date and start_time', async () => {
    const db = createMockDb([
      // 1. traveler exists
      { rows: [{ traveler_id: 'tid-1' }] },
      // 2. group_ids
      { rows: [{ group_id: 'grp-a' }] },
      // 3. option_ids
      { rows: [{ option_id: 'opt-1' }] },
      // 4. hotel_id
      { rows: [{ hotel_id: 'htl-1' }] },
      // 5. all events (already sorted by date, start_time from SQL)
      {
        rows: [
          {
            event_id: 'evt-1',
            name: 'Opening',
            event_type: 'ceremony',
            date: '2027-06-01',
            start_time: '2027-06-01T09:00:00Z',
            end_time: '2027-06-01T11:00:00Z',
            location: 'Main Hall',
            description: 'Welcome',
          },
          {
            event_id: 'evt-2',
            name: 'VIP Dinner',
            event_type: 'meal',
            date: '2027-06-01',
            start_time: '2027-06-01T19:00:00Z',
            end_time: null,
            location: 'Restaurant',
            description: null,
          },
        ],
      },
      // 6. eligibility rules
      {
        rows: [
          // evt-2 restricted to grp-vip only
          { event_id: 'evt-2', group_id: 'grp-vip', hotel_id: null, option_id: null },
        ],
      },
    ]);

    const service = createItineraryService({ db });
    const result = await service.getItinerary('tid-1');

    expect(result).not.toHaveProperty('error');
    const response = result as { events: unknown[] };
    // evt-1 has no eligibility (open to all), evt-2 restricted to grp-vip (traveler has grp-a)
    expect(response.events).toHaveLength(1);
    expect((response.events[0] as { event_id: string }).event_id).toBe('evt-1');
  });

  it('should include events matching traveler option_ids', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-1' }] },
      { rows: [] }, // no groups
      { rows: [{ option_id: 'opt-spa' }] }, // option_ids
      { rows: [] }, // no hotel
      {
        rows: [
          {
            event_id: 'evt-spa',
            name: 'Spa Day',
            event_type: 'activity',
            date: '2027-06-02',
            start_time: '2027-06-02T10:00:00Z',
            end_time: '2027-06-02T12:00:00Z',
            location: 'Spa Center',
            description: 'Relaxation',
          },
        ],
      },
      {
        rows: [
          { event_id: 'evt-spa', group_id: null, hotel_id: null, option_id: 'opt-spa' },
        ],
      },
    ]);

    const service = createItineraryService({ db });
    const result = await service.getItinerary('tid-1');

    expect(result).not.toHaveProperty('error');
    const response = result as { events: unknown[] };
    expect(response.events).toHaveLength(1);
  });

  it('should return all open events for a traveler with no assignments', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-1' }] },
      { rows: [] }, // no groups
      { rows: [] }, // no options
      { rows: [] }, // no hotel
      {
        rows: [
          {
            event_id: 'evt-open',
            name: 'General Session',
            event_type: 'ceremony',
            date: '2027-06-01',
            start_time: '2027-06-01T08:00:00Z',
            end_time: null,
            location: 'Auditorium',
            description: null,
          },
        ],
      },
      { rows: [] }, // no eligibility rules
    ]);

    const service = createItineraryService({ db });
    const result = await service.getItinerary('tid-1');

    expect(result).not.toHaveProperty('error');
    const response = result as { events: unknown[] };
    expect(response.events).toHaveLength(1);
    expect((response.events[0] as { event_id: string }).event_id).toBe('evt-open');
  });

  it('should strip eligibility from the response shape', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-1' }] },
      { rows: [{ group_id: 'grp-a' }] },
      { rows: [] },
      { rows: [] },
      {
        rows: [
          {
            event_id: 'evt-1',
            name: 'Event',
            event_type: 'activity',
            date: '2027-06-01',
            start_time: '2027-06-01T10:00:00Z',
            end_time: null,
            location: 'Venue',
            description: null,
          },
        ],
      },
      {
        rows: [
          { event_id: 'evt-1', group_id: 'grp-a', hotel_id: null, option_id: null },
        ],
      },
    ]);

    const service = createItineraryService({ db });
    const result = await service.getItinerary('tid-1');

    expect(result).not.toHaveProperty('error');
    const response = result as { events: Record<string, unknown>[] };
    expect(response.events[0]).not.toHaveProperty('eligibility');
    expect(response.events[0]).toHaveProperty('event_id');
    expect(response.events[0]).toHaveProperty('name');
    expect(response.events[0]).toHaveProperty('event_type');
    expect(response.events[0]).toHaveProperty('date');
    expect(response.events[0]).toHaveProperty('start_time');
    expect(response.events[0]).toHaveProperty('end_time');
    expect(response.events[0]).toHaveProperty('location');
    expect(response.events[0]).toHaveProperty('description');
  });
});
