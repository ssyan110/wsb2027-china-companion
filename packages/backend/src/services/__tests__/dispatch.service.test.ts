import { describe, it, expect, vi } from 'vitest';
import {
  autoDispatchAlgorithm,
  createDispatchService,
  type TravelerFlight,
  type Bus,
} from '../dispatch.service.js';

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

// ─── autoDispatchAlgorithm (pure function) tests ─────────────

describe('autoDispatchAlgorithm', () => {
  it('should return empty assignments for empty travelers', () => {
    const buses: Bus[] = [{ bus_id: 'b1', bus_number: 'Bus 01', capacity: 40 }];
    const result = autoDispatchAlgorithm([], buses);
    expect(result).toEqual([]);
  });

  it('should return empty assignments for empty buses', () => {
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
    ];
    const result = autoDispatchAlgorithm(travelers, []);
    expect(result).toEqual([]);
  });

  it('should assign individual travelers to buses', () => {
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't2', family_id: null, flight_id: 'f2', arrival_time: '2027-06-01T10:10:00Z', terminal: 'T1' },
    ];
    const buses: Bus[] = [{ bus_id: 'b1', bus_number: 'Bus 01', capacity: 40 }];

    const result = autoDispatchAlgorithm(travelers, buses);

    expect(result).toHaveLength(2);
    expect(result.every((a) => a.bus_id === 'b1')).toBe(true);
    expect(result.every((a) => a.bus_number === 'Bus 01')).toBe(true);
  });

  it('should keep family members on the same bus', () => {
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: 'fam-1', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't2', family_id: 'fam-1', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't3', family_id: 'fam-1', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't4', family_id: null, flight_id: 'f2', arrival_time: '2027-06-01T10:05:00Z', terminal: 'T1' },
    ];
    const buses: Bus[] = [
      { bus_id: 'b1', bus_number: 'Bus 01', capacity: 5 },
      { bus_id: 'b2', bus_number: 'Bus 02', capacity: 5 },
    ];

    const result = autoDispatchAlgorithm(travelers, buses);

    expect(result).toHaveLength(4);
    // All family members should be on the same bus
    const familyAssignments = result.filter((a) => ['t1', 't2', 't3'].includes(a.traveler_id));
    const familyBusIds = new Set(familyAssignments.map((a) => a.bus_id));
    expect(familyBusIds.size).toBe(1);
  });

  it('should group travelers by terminal', () => {
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't2', family_id: null, flight_id: 'f2', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T2' },
    ];
    const buses: Bus[] = [
      { bus_id: 'b1', bus_number: 'Bus 01', capacity: 40 },
      { bus_id: 'b2', bus_number: 'Bus 02', capacity: 40 },
    ];

    const result = autoDispatchAlgorithm(travelers, buses);
    expect(result).toHaveLength(2);
    // Both should be assigned (to potentially different buses)
    expect(result.map((a) => a.traveler_id).sort()).toEqual(['t1', 't2']);
  });

  it('should cluster by 30-min arrival windows within a terminal', () => {
    // Two clusters: 10:00-10:20 and 11:00-11:10
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T11:10:00Z', terminal: 'T1' },
      { traveler_id: 't2', family_id: null, flight_id: 'f2', arrival_time: '2027-06-01T11:00:00Z', terminal: 'T1' },
      { traveler_id: 't3', family_id: null, flight_id: 'f3', arrival_time: '2027-06-01T10:20:00Z', terminal: 'T1' },
      { traveler_id: 't4', family_id: null, flight_id: 'f4', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
    ];
    const buses: Bus[] = [
      { bus_id: 'b1', bus_number: 'Bus 01', capacity: 2 },
      { bus_id: 'b2', bus_number: 'Bus 02', capacity: 2 },
    ];

    const result = autoDispatchAlgorithm(travelers, buses);
    expect(result).toHaveLength(4);
  });

  it('should not exceed bus capacity', () => {
    const travelers: TravelerFlight[] = Array.from({ length: 10 }, (_, i) => ({
      traveler_id: `t${i}`,
      family_id: null,
      flight_id: 'f1',
      arrival_time: '2027-06-01T10:00:00Z',
      terminal: 'T1',
    }));
    const buses: Bus[] = [
      { bus_id: 'b1', bus_number: 'Bus 01', capacity: 5 },
      { bus_id: 'b2', bus_number: 'Bus 02', capacity: 5 },
    ];

    const result = autoDispatchAlgorithm(travelers, buses);

    // Count per bus
    const busCounts = new Map<string, number>();
    for (const a of result) {
      busCounts.set(a.bus_id, (busCounts.get(a.bus_id) ?? 0) + 1);
    }
    for (const [busId, count] of busCounts) {
      const bus = buses.find((b) => b.bus_id === busId)!;
      expect(count).toBeLessThanOrEqual(bus.capacity);
    }
  });

  it('should skip travelers when all buses are full', () => {
    const travelers: TravelerFlight[] = Array.from({ length: 5 }, (_, i) => ({
      traveler_id: `t${i}`,
      family_id: null,
      flight_id: 'f1',
      arrival_time: '2027-06-01T10:00:00Z',
      terminal: 'T1',
    }));
    const buses: Bus[] = [{ bus_id: 'b1', bus_number: 'Bus 01', capacity: 3 }];

    const result = autoDispatchAlgorithm(travelers, buses);
    expect(result).toHaveLength(3); // only 3 fit
  });

  it('should skip a family that does not fit in any bus', () => {
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: 'fam-big', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't2', family_id: 'fam-big', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't3', family_id: 'fam-big', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't4', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
    ];
    const buses: Bus[] = [{ bus_id: 'b1', bus_number: 'Bus 01', capacity: 2 }];

    const result = autoDispatchAlgorithm(travelers, buses);
    // Family of 3 doesn't fit in bus of capacity 2, but individual t4 should fit
    expect(result).toHaveLength(1);
    expect(result[0].traveler_id).toBe('t4');
  });

  it('should handle travelers with null terminal', () => {
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: null },
    ];
    const buses: Bus[] = [{ bus_id: 'b1', bus_number: 'Bus 01', capacity: 40 }];

    const result = autoDispatchAlgorithm(travelers, buses);
    expect(result).toHaveLength(1);
    expect(result[0].traveler_id).toBe('t1');
  });

  it('should sort families by size DESC and place largest first', () => {
    // Large family (4) and small family (2) competing for a bus of capacity 5
    const travelers: TravelerFlight[] = [
      { traveler_id: 't1', family_id: 'fam-small', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't2', family_id: 'fam-small', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't3', family_id: 'fam-large', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't4', family_id: 'fam-large', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't5', family_id: 'fam-large', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
      { traveler_id: 't6', family_id: 'fam-large', flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
    ];
    const buses: Bus[] = [
      { bus_id: 'b1', bus_number: 'Bus 01', capacity: 5 },
      { bus_id: 'b2', bus_number: 'Bus 02', capacity: 5 },
    ];

    const result = autoDispatchAlgorithm(travelers, buses);
    expect(result).toHaveLength(6);

    // Large family should all be on the same bus
    const largeFamilyBuses = new Set(
      result.filter((a) => ['t3', 't4', 't5', 't6'].includes(a.traveler_id)).map((a) => a.bus_id),
    );
    expect(largeFamilyBuses.size).toBe(1);

    // Small family should all be on the same bus
    const smallFamilyBuses = new Set(
      result.filter((a) => ['t1', 't2'].includes(a.traveler_id)).map((a) => a.bus_id),
    );
    expect(smallFamilyBuses.size).toBe(1);
  });
});

// ─── createDispatchService.autoDispatch tests ────────────────

describe('DispatchService.autoDispatch', () => {
  it('should return error when no travelers have flights', async () => {
    const db = createMockDb([
      { rows: [] }, // no travelers with flights
    ]);

    const service = createDispatchService({ db });
    const result = await service.autoDispatch('evt-1');

    expect(result).toEqual({ error: 'no_travelers', message: 'No travelers with flight data found' });
  });

  it('should return error when no buses configured for event', async () => {
    const db = createMockDb([
      {
        rows: [
          { traveler_id: 't1', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
        ],
      },
      { rows: [] }, // no buses
    ]);

    const service = createDispatchService({ db });
    const result = await service.autoDispatch('evt-1');

    expect(result).toEqual({ error: 'no_buses', message: 'No buses configured for this event' });
  });

  it('should return proposed assignments on success', async () => {
    const db = createMockDb([
      {
        rows: [
          { traveler_id: 't1', family_id: null, flight_id: 'f1', arrival_time: '2027-06-01T10:00:00Z', terminal: 'T1' },
          { traveler_id: 't2', family_id: null, flight_id: 'f2', arrival_time: '2027-06-01T10:15:00Z', terminal: 'T1' },
        ],
      },
      {
        rows: [
          { bus_id: 'b1', bus_number: 'Bus 01', capacity: 40 },
        ],
      },
    ]);

    const service = createDispatchService({ db });
    const result = await service.autoDispatch('evt-1');

    expect('error' in result).toBe(false);
    const proposal = result as { proposed_assignments: Array<{ traveler_id: string; bus_id: string; bus_number: string }> };
    expect(proposal.proposed_assignments).toHaveLength(2);
    expect(proposal.proposed_assignments[0].bus_number).toBe('Bus 01');
  });
});

// ─── createDispatchService.commitDispatch tests ──────────────

describe('DispatchService.commitDispatch', () => {
  it('should return committed: 0 for empty assignments', async () => {
    const db = createMockDb([]);

    const service = createDispatchService({ db });
    const result = await service.commitDispatch([], 'evt-1');

    expect(result).toEqual({ committed: 0 });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should bulk insert assignments and return committed count', async () => {
    const db = createMockDb([
      { rows: [] }, // INSERT result
    ]);

    const service = createDispatchService({ db });
    const result = await service.commitDispatch(
      [
        { traveler_id: 't1', bus_id: 'b1' },
        { traveler_id: 't2', bus_id: 'b1' },
      ],
      'evt-1',
    );

    expect(result).toEqual({ committed: 2 });
    expect(db.query).toHaveBeenCalledTimes(1);

    const [sql, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sql).toContain('INSERT INTO bus_assignments');
    expect(params).toHaveLength(6); // 2 assignments × 3 params each
    expect(params).toEqual(['t1', 'b1', 'evt-1', 't2', 'b1', 'evt-1']);
  });
});
