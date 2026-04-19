import { describe, it, expect, vi } from 'vitest';
import {
  createAdminEntitiesService,
  validateFlightCsvRow,
} from '../admin-entities.service.js';
import type { FlightCsvRow } from '../admin-entities.service.js';

// ─── Mock helpers ────────────────────────────────────────────

function createMockDb(queryResponses: Array<{ rows: Record<string, unknown>[] }> = []) {
  let callIndex = 0;
  const mockClient = {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [] };
      callIndex++;
      return Promise.resolve(response);
    }),
    release: vi.fn(),
  };
  return {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [] };
      callIndex++;
      return Promise.resolve(response);
    }),
    connect: vi.fn().mockResolvedValue(mockClient),
    _client: mockClient,
  } as unknown as import('pg').Pool & { _client: typeof mockClient };
}

// ─── validateFlightCsvRow ────────────────────────────────────

describe('validateFlightCsvRow', () => {
  it('should return no errors for a valid row', () => {
    const row: FlightCsvRow = {
      flight_number: 'UA123',
      arrival_time: '2027-06-15T10:30:00Z',
      terminal: 'T2',
    };
    expect(validateFlightCsvRow(row, 1)).toEqual([]);
  });

  it('should return error when flight_number is missing', () => {
    const row: FlightCsvRow = { arrival_time: '2027-06-15T10:30:00Z' };
    const errors = validateFlightCsvRow(row, 1);
    expect(errors).toEqual([{ row: 1, field: 'flight_number', reason: 'flight_number is required' }]);
  });

  it('should return error when arrival_time is missing', () => {
    const row: FlightCsvRow = { flight_number: 'UA123' };
    const errors = validateFlightCsvRow(row, 1);
    expect(errors).toEqual([{ row: 1, field: 'arrival_time', reason: 'arrival_time is required' }]);
  });

  it('should return error for invalid date format', () => {
    const row: FlightCsvRow = { flight_number: 'UA123', arrival_time: 'not-a-date' };
    const errors = validateFlightCsvRow(row, 1);
    expect(errors).toEqual([{ row: 1, field: 'arrival_time', reason: 'invalid date format' }]);
  });

  it('should collect multiple errors', () => {
    const row: FlightCsvRow = {};
    const errors = validateFlightCsvRow(row, 3);
    expect(errors.length).toBe(2);
    expect(errors.map(e => e.field)).toEqual(['flight_number', 'arrival_time']);
  });
});

// ─── Groups CRUD ─────────────────────────────────────────────

describe('AdminEntitiesService — Groups', () => {
  it('listGroups should return all groups', async () => {
    const db = createMockDb([{
      rows: [{ group_id: 'g1', name: 'VIP', description: 'VIP group', created_at: '2025-01-01T00:00:00Z' }],
    }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.listGroups();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('VIP');
  });

  it('createGroup should insert and return the group', async () => {
    const db = createMockDb([{
      rows: [{ group_id: 'g-new', name: 'Speakers', description: null, created_at: '2025-01-01T00:00:00Z' }],
    }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.createGroup({ name: 'Speakers' });
    expect(result.group_id).toBe('g-new');
    expect(result.name).toBe('Speakers');
  });

  it('updateGroup should return not_found for missing group', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.updateGroup('nonexistent', { name: 'Updated' });
    expect(result).toEqual({ error: 'not_found', message: 'Group not found' });
  });

  it('updateGroup should update and return the group', async () => {
    const db = createMockDb([{
      rows: [{ group_id: 'g1', name: 'Updated', description: null, created_at: '2025-01-01T00:00:00Z' }],
    }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.updateGroup('g1', { name: 'Updated' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) expect(result.name).toBe('Updated');
  });

  it('deleteGroup should return not_found for missing group', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.deleteGroup('nonexistent');
    expect(result).toEqual({ error: 'not_found', message: 'Group not found' });
  });

  it('deleteGroup should return success for existing group', async () => {
    const db = createMockDb([{ rows: [{ group_id: 'g1' }] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.deleteGroup('g1');
    expect(result).toEqual({ success: true });
  });
});

// ─── Events CRUD ─────────────────────────────────────────────

describe('AdminEntitiesService — Events', () => {
  const sampleEvent = {
    event_id: 'e1', name: 'Gala Dinner', event_type: 'meal', date: '2027-06-15',
    start_time: '2027-06-15T18:00:00Z', end_time: '2027-06-15T22:00:00Z',
    location: 'Grand Ballroom', description: 'Annual gala', created_at: '2025-01-01T00:00:00Z',
  };

  it('listEvents should return all events', async () => {
    const db = createMockDb([{ rows: [sampleEvent] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.listEvents();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Gala Dinner');
  });

  it('createEvent should reject invalid event_type', async () => {
    const db = createMockDb([]);
    const service = createAdminEntitiesService({ db });
    const result = await service.createEvent({
      name: 'Test', event_type: 'invalid' as any, date: '2027-06-15',
    });
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toBe('validation_error');
  });

  it('createEvent should insert and return the event', async () => {
    const db = createMockDb([{ rows: [sampleEvent] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.createEvent({
      name: 'Gala Dinner', event_type: 'meal', date: '2027-06-15',
    });
    expect('error' in result).toBe(false);
    if (!('error' in result)) expect(result.event_id).toBe('e1');
  });

  it('updateEvent should return not_found for missing event', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.updateEvent('nonexistent', { name: 'Updated' });
    expect(result).toEqual({ error: 'not_found', message: 'Event not found' });
  });

  it('deleteEvent should return success for existing event', async () => {
    const db = createMockDb([{ rows: [{ event_id: 'e1' }] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.deleteEvent('e1');
    expect(result).toEqual({ success: true });
  });
});

// ─── Buses CRUD ──────────────────────────────────────────────

describe('AdminEntitiesService — Buses', () => {
  const sampleBus = {
    bus_id: 'b1', bus_number: 'BUS-01', capacity: 45, event_id: null,
    departure_time: null, terminal: null, created_at: '2025-01-01T00:00:00Z',
  };

  it('listBuses should return all buses', async () => {
    const db = createMockDb([{ rows: [sampleBus] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.listBuses();
    expect(result).toHaveLength(1);
    expect(result[0].bus_number).toBe('BUS-01');
  });

  it('createBus should reject missing bus_number', async () => {
    const db = createMockDb([]);
    const service = createAdminEntitiesService({ db });
    const result = await service.createBus({ bus_number: '', capacity: 45 });
    expect('error' in result).toBe(true);
  });

  it('createBus should reject zero capacity', async () => {
    const db = createMockDb([]);
    const service = createAdminEntitiesService({ db });
    const result = await service.createBus({ bus_number: 'BUS-01', capacity: 0 });
    expect('error' in result).toBe(true);
  });

  it('createBus should insert and return the bus', async () => {
    const db = createMockDb([{ rows: [sampleBus] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.createBus({ bus_number: 'BUS-01', capacity: 45 });
    expect('error' in result).toBe(false);
    if (!('error' in result)) expect(result.bus_id).toBe('b1');
  });

  it('updateBus should return not_found for missing bus', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.updateBus('nonexistent', { capacity: 50 });
    expect(result).toEqual({ error: 'not_found', message: 'Bus not found' });
  });
});

// ─── Hotels CRUD ─────────────────────────────────────────────

describe('AdminEntitiesService — Hotels', () => {
  const sampleHotel = {
    hotel_id: 'h1', name: 'Grand Hotel', address_en: '123 Main St',
    address_cn: '主街123号', created_at: '2025-01-01T00:00:00Z',
  };

  it('listHotels should return all hotels', async () => {
    const db = createMockDb([{ rows: [sampleHotel] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.listHotels();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Grand Hotel');
  });

  it('createHotel should insert and return the hotel', async () => {
    const db = createMockDb([{ rows: [sampleHotel] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.createHotel({ name: 'Grand Hotel', address_en: '123 Main St', address_cn: '主街123号' });
    expect(result.hotel_id).toBe('h1');
  });

  it('updateHotel should return not_found for missing hotel', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.updateHotel('nonexistent', { name: 'Updated' });
    expect(result).toEqual({ error: 'not_found', message: 'Hotel not found' });
  });

  it('deleteHotel should return not_found for missing hotel', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.deleteHotel('nonexistent');
    expect(result).toEqual({ error: 'not_found', message: 'Hotel not found' });
  });

  it('deleteHotel should return success for existing hotel', async () => {
    const db = createMockDb([{ rows: [{ hotel_id: 'h1' }] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.deleteHotel('h1');
    expect(result).toEqual({ success: true });
  });
});

// ─── Assignment endpoints ────────────────────────────────────

describe('AdminEntitiesService — Assignments', () => {
  it('assignGroup should insert into traveler_groups', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.assignGroup({ traveler_id: 't1', group_id: 'g1' });
    expect(result).toEqual({ success: true });
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('assignGroup should return validation_error on FK violation', async () => {
    const db = createMockDb([]);
    db.query = vi.fn().mockRejectedValue({ code: '23503' });
    const service = createAdminEntitiesService({ db });
    const result = await service.assignGroup({ traveler_id: 'bad', group_id: 'bad' });
    expect(result).toEqual({ error: 'validation_error', message: 'Invalid traveler_id or group_id' });
  });

  it('assignHotel should insert into traveler_hotels', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.assignHotel({ traveler_id: 't1', hotel_id: 'h1' });
    expect(result).toEqual({ success: true });
  });

  it('assignHotel should return validation_error on FK violation', async () => {
    const db = createMockDb([]);
    db.query = vi.fn().mockRejectedValue({ code: '23503' });
    const service = createAdminEntitiesService({ db });
    const result = await service.assignHotel({ traveler_id: 'bad', hotel_id: 'bad' });
    expect(result).toEqual({ error: 'validation_error', message: 'Invalid traveler_id or hotel_id' });
  });

  it('assignBus should insert into bus_assignments', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createAdminEntitiesService({ db });
    const result = await service.assignBus({ traveler_id: 't1', bus_id: 'b1', event_id: 'e1' });
    expect(result).toEqual({ success: true });
  });

  it('assignBus should return validation_error on FK violation', async () => {
    const db = createMockDb([]);
    db.query = vi.fn().mockRejectedValue({ code: '23503' });
    const service = createAdminEntitiesService({ db });
    const result = await service.assignBus({ traveler_id: 'bad', bus_id: 'bad', event_id: 'bad' });
    expect(result).toEqual({ error: 'validation_error', message: 'Invalid traveler_id, bus_id, or event_id' });
  });
});

// ─── Flight CSV Import ───────────────────────────────────────

describe('AdminEntitiesService — importFlightsCsv', () => {
  it('should parse valid flight CSV and return import count', async () => {
    const csv = `flight_number,arrival_time,terminal
UA123,2027-06-15T10:30:00Z,T2
BA456,2027-06-15T14:00:00Z,T1`;

    const flightRow1 = { flight_id: 'f1' };
    const flightRow2 = { flight_id: 'f2' };

    // Mock client queries: BEGIN, INSERT f1, INSERT f2, COMMIT
    const db = createMockDb([
      { rows: [] },           // BEGIN
      { rows: [flightRow1] }, // INSERT flight 1
      { rows: [flightRow2] }, // INSERT flight 2
      { rows: [] },           // COMMIT
    ]);

    const service = createAdminEntitiesService({ db });
    const result = await service.importFlightsCsv(csv);

    expect(result.imported).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it('should collect row-level errors without aborting', async () => {
    const csv = `flight_number,arrival_time,terminal
,not-a-date,T1
UA789,2027-06-15T10:30:00Z,T2`;

    const flightRow = { flight_id: 'f1' };

    const db = createMockDb([
      { rows: [] },          // BEGIN
      { rows: [flightRow] }, // INSERT flight
      { rows: [] },          // COMMIT
    ]);

    const service = createAdminEntitiesService({ db });
    const result = await service.importFlightsCsv(csv);

    expect(result.imported).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    const row1Errors = result.errors.filter(e => e.row === 1);
    expect(row1Errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should return zero imported for empty CSV', async () => {
    const csv = `flight_number,arrival_time,terminal`;
    const db = createMockDb([]);
    const service = createAdminEntitiesService({ db });
    const result = await service.importFlightsCsv(csv);
    expect(result.imported).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('should link flights to travelers when traveler_email is provided', async () => {
    const csv = `flight_number,arrival_time,terminal,traveler_email
UA123,2027-06-15T10:30:00Z,T2,jane@example.com`;

    const flightRow = { flight_id: 'f1' };
    const travelerRow = { traveler_id: 't1' };

    // Mock client queries: BEGIN, INSERT flight, SELECT traveler, INSERT traveler_flights, COMMIT
    const db = createMockDb([
      { rows: [] },            // BEGIN
      { rows: [flightRow] },   // INSERT flight
      { rows: [travelerRow] }, // SELECT traveler by email
      { rows: [] },            // INSERT traveler_flights
      { rows: [] },            // COMMIT
    ]);

    const service = createAdminEntitiesService({ db });
    const result = await service.importFlightsCsv(csv);

    expect(result.imported).toBe(1);
    expect(result.errors).toEqual([]);
  });
});
