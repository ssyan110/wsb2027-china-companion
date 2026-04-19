import type { Pool } from 'pg';
import Papa from 'papaparse';
import type { EventType, ImportResponse, ImportError } from '@wsb/shared';

// ─── Types ───────────────────────────────────────────────────

export interface AdminEntitiesServiceDeps {
  db: Pool;
}

// Row types
export interface GroupRow {
  group_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface EventRow {
  event_id: string;
  name: string;
  event_type: EventType;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  created_at: string;
}

export interface BusRow {
  bus_id: string;
  bus_number: string;
  capacity: number;
  event_id: string | null;
  departure_time: string | null;
  terminal: string | null;
  created_at: string;
}

export interface HotelRow {
  hotel_id: string;
  name: string;
  address_en: string | null;
  address_cn: string | null;
  created_at: string;
}

export interface FlightRow {
  flight_id: string;
  flight_number: string;
  arrival_time: string;
  terminal: string | null;
  created_at: string;
}

// Input types
export interface CreateGroupInput {
  name: string;
  description?: string;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
}

export interface CreateEventInput {
  name: string;
  event_type: EventType;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
}

export interface UpdateEventInput {
  name?: string;
  event_type?: EventType;
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description?: string | null;
}

export interface CreateBusInput {
  bus_number: string;
  capacity: number;
  event_id?: string;
  departure_time?: string;
  terminal?: string;
}

export interface UpdateBusInput {
  bus_number?: string;
  capacity?: number;
  event_id?: string | null;
  departure_time?: string | null;
  terminal?: string | null;
}

export interface CreateHotelInput {
  name: string;
  address_en?: string;
  address_cn?: string;
}

export interface UpdateHotelInput {
  name?: string;
  address_en?: string | null;
  address_cn?: string | null;
}

// Assignment inputs
export interface AssignGroupInput {
  traveler_id: string;
  group_id: string;
}

export interface AssignHotelInput {
  traveler_id: string;
  hotel_id: string;
}

export interface AssignBusInput {
  traveler_id: string;
  bus_id: string;
  event_id: string;
}

export interface NotFoundError {
  error: 'not_found';
  message: string;
}

export interface ValidationError {
  error: 'validation_error';
  message: string;
}

// Flight CSV row
export interface FlightCsvRow {
  flight_number?: string;
  arrival_time?: string;
  terminal?: string;
  traveler_email?: string;
  [key: string]: string | undefined;
}

// Valid event types for runtime validation
const VALID_EVENT_TYPES: readonly string[] = [
  'bus', 'meal', 'activity', 'ceremony', 'transfer', 'hotel_checkin',
];


// ─── Pure validation for flight CSV (exported for testing) ───

export function validateFlightCsvRow(
  row: FlightCsvRow,
  rowIndex: number,
): ImportError[] {
  const errors: ImportError[] = [];

  if (!row.flight_number || row.flight_number.trim() === '') {
    errors.push({ row: rowIndex, field: 'flight_number', reason: 'flight_number is required' });
  }

  if (!row.arrival_time || row.arrival_time.trim() === '') {
    errors.push({ row: rowIndex, field: 'arrival_time', reason: 'arrival_time is required' });
  } else {
    const d = new Date(row.arrival_time.trim());
    if (isNaN(d.getTime())) {
      errors.push({ row: rowIndex, field: 'arrival_time', reason: 'invalid date format' });
    }
  }

  return errors;
}

// ─── Service factory ─────────────────────────────────────────

export function createAdminEntitiesService(deps: AdminEntitiesServiceDeps) {
  const { db } = deps;

  // ── Groups CRUD ────────────────────────────────────────────

  async function listGroups(): Promise<GroupRow[]> {
    const result = await db.query(
      `SELECT group_id, name, description, created_at FROM groups ORDER BY created_at DESC`,
    );
    return result.rows as GroupRow[];
  }

  async function createGroup(input: CreateGroupInput): Promise<GroupRow> {
    const result = await db.query(
      `INSERT INTO groups (name, description) VALUES ($1, $2)
       RETURNING group_id, name, description, created_at`,
      [input.name, input.description ?? null],
    );
    return result.rows[0] as GroupRow;
  }

  async function updateGroup(id: string, input: UpdateGroupInput): Promise<GroupRow | NotFoundError> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(input.description);
    }

    if (setClauses.length === 0) {
      const existing = await db.query(`SELECT group_id, name, description, created_at FROM groups WHERE group_id = $1`, [id]);
      if (existing.rows.length === 0) return { error: 'not_found', message: 'Group not found' };
      return existing.rows[0] as GroupRow;
    }

    values.push(id);
    const result = await db.query(
      `UPDATE groups SET ${setClauses.join(', ')} WHERE group_id = $${idx}
       RETURNING group_id, name, description, created_at`,
      values,
    );

    if (result.rows.length === 0) return { error: 'not_found', message: 'Group not found' };
    return result.rows[0] as GroupRow;
  }

  async function deleteGroup(id: string): Promise<{ success: boolean } | NotFoundError> {
    const result = await db.query(`DELETE FROM groups WHERE group_id = $1 RETURNING group_id`, [id]);
    if (result.rows.length === 0) return { error: 'not_found', message: 'Group not found' };
    return { success: true };
  }

  // ── Events CRUD ────────────────────────────────────────────

  async function listEvents(): Promise<EventRow[]> {
    const result = await db.query(
      `SELECT event_id, name, event_type, date, start_time, end_time, location, description, created_at
       FROM events ORDER BY date, start_time`,
    );
    return result.rows as EventRow[];
  }

  async function createEvent(input: CreateEventInput): Promise<EventRow | ValidationError> {
    if (!VALID_EVENT_TYPES.includes(input.event_type)) {
      return { error: 'validation_error', message: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` };
    }
    const result = await db.query(
      `INSERT INTO events (name, event_type, date, start_time, end_time, location, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING event_id, name, event_type, date, start_time, end_time, location, description, created_at`,
      [input.name, input.event_type, input.date, input.start_time ?? null, input.end_time ?? null, input.location ?? null, input.description ?? null],
    );
    return result.rows[0] as EventRow;
  }

  async function updateEvent(id: string, input: UpdateEventInput): Promise<EventRow | NotFoundError | ValidationError> {
    if (input.event_type !== undefined && !VALID_EVENT_TYPES.includes(input.event_type)) {
      return { error: 'validation_error', message: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` };
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(input.name); }
    if (input.event_type !== undefined) { setClauses.push(`event_type = $${idx++}`); values.push(input.event_type); }
    if (input.date !== undefined) { setClauses.push(`date = $${idx++}`); values.push(input.date); }
    if (input.start_time !== undefined) { setClauses.push(`start_time = $${idx++}`); values.push(input.start_time); }
    if (input.end_time !== undefined) { setClauses.push(`end_time = $${idx++}`); values.push(input.end_time); }
    if (input.location !== undefined) { setClauses.push(`location = $${idx++}`); values.push(input.location); }
    if (input.description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(input.description); }

    if (setClauses.length === 0) {
      const existing = await db.query(
        `SELECT event_id, name, event_type, date, start_time, end_time, location, description, created_at FROM events WHERE event_id = $1`, [id],
      );
      if (existing.rows.length === 0) return { error: 'not_found', message: 'Event not found' };
      return existing.rows[0] as EventRow;
    }

    values.push(id);
    const result = await db.query(
      `UPDATE events SET ${setClauses.join(', ')} WHERE event_id = $${idx}
       RETURNING event_id, name, event_type, date, start_time, end_time, location, description, created_at`,
      values,
    );

    if (result.rows.length === 0) return { error: 'not_found', message: 'Event not found' };
    return result.rows[0] as EventRow;
  }

  async function deleteEvent(id: string): Promise<{ success: boolean } | NotFoundError> {
    const result = await db.query(`DELETE FROM events WHERE event_id = $1 RETURNING event_id`, [id]);
    if (result.rows.length === 0) return { error: 'not_found', message: 'Event not found' };
    return { success: true };
  }

  // ── Buses CRUD ─────────────────────────────────────────────

  async function listBuses(): Promise<BusRow[]> {
    const result = await db.query(
      `SELECT bus_id, bus_number, capacity, event_id, departure_time, terminal, created_at
       FROM buses ORDER BY bus_number`,
    );
    return result.rows as BusRow[];
  }

  async function createBus(input: CreateBusInput): Promise<BusRow | ValidationError> {
    if (!input.bus_number || !input.capacity || input.capacity <= 0) {
      return { error: 'validation_error', message: 'bus_number and positive capacity are required' };
    }
    try {
      const result = await db.query(
        `INSERT INTO buses (bus_number, capacity, event_id, departure_time, terminal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING bus_id, bus_number, capacity, event_id, departure_time, terminal, created_at`,
        [input.bus_number, input.capacity, input.event_id ?? null, input.departure_time ?? null, input.terminal ?? null],
      );
      return result.rows[0] as BusRow;
    } catch (err: unknown) {
      const pgErr = err as { code?: string; constraint?: string };
      if (pgErr.code === '23505') {
        return { error: 'validation_error', message: 'bus_number already exists' };
      }
      throw err;
    }
  }

  async function updateBus(id: string, input: UpdateBusInput): Promise<BusRow | NotFoundError> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.bus_number !== undefined) { setClauses.push(`bus_number = $${idx++}`); values.push(input.bus_number); }
    if (input.capacity !== undefined) { setClauses.push(`capacity = $${idx++}`); values.push(input.capacity); }
    if (input.event_id !== undefined) { setClauses.push(`event_id = $${idx++}`); values.push(input.event_id); }
    if (input.departure_time !== undefined) { setClauses.push(`departure_time = $${idx++}`); values.push(input.departure_time); }
    if (input.terminal !== undefined) { setClauses.push(`terminal = $${idx++}`); values.push(input.terminal); }

    if (setClauses.length === 0) {
      const existing = await db.query(
        `SELECT bus_id, bus_number, capacity, event_id, departure_time, terminal, created_at FROM buses WHERE bus_id = $1`, [id],
      );
      if (existing.rows.length === 0) return { error: 'not_found', message: 'Bus not found' };
      return existing.rows[0] as BusRow;
    }

    values.push(id);
    const result = await db.query(
      `UPDATE buses SET ${setClauses.join(', ')} WHERE bus_id = $${idx}
       RETURNING bus_id, bus_number, capacity, event_id, departure_time, terminal, created_at`,
      values,
    );

    if (result.rows.length === 0) return { error: 'not_found', message: 'Bus not found' };
    return result.rows[0] as BusRow;
  }

  // ── Hotels CRUD ────────────────────────────────────────────

  async function listHotels(): Promise<HotelRow[]> {
    const result = await db.query(
      `SELECT hotel_id, name, address_en, address_cn, created_at FROM hotels ORDER BY name`,
    );
    return result.rows as HotelRow[];
  }

  async function createHotel(input: CreateHotelInput): Promise<HotelRow> {
    const result = await db.query(
      `INSERT INTO hotels (name, address_en, address_cn) VALUES ($1, $2, $3)
       RETURNING hotel_id, name, address_en, address_cn, created_at`,
      [input.name, input.address_en ?? null, input.address_cn ?? null],
    );
    return result.rows[0] as HotelRow;
  }

  async function updateHotel(id: string, input: UpdateHotelInput): Promise<HotelRow | NotFoundError> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(input.name); }
    if (input.address_en !== undefined) { setClauses.push(`address_en = $${idx++}`); values.push(input.address_en); }
    if (input.address_cn !== undefined) { setClauses.push(`address_cn = $${idx++}`); values.push(input.address_cn); }

    if (setClauses.length === 0) {
      const existing = await db.query(
        `SELECT hotel_id, name, address_en, address_cn, created_at FROM hotels WHERE hotel_id = $1`, [id],
      );
      if (existing.rows.length === 0) return { error: 'not_found', message: 'Hotel not found' };
      return existing.rows[0] as HotelRow;
    }

    values.push(id);
    const result = await db.query(
      `UPDATE hotels SET ${setClauses.join(', ')} WHERE hotel_id = $${idx}
       RETURNING hotel_id, name, address_en, address_cn, created_at`,
      values,
    );

    if (result.rows.length === 0) return { error: 'not_found', message: 'Hotel not found' };
    return result.rows[0] as HotelRow;
  }

  async function deleteHotel(id: string): Promise<{ success: boolean } | NotFoundError> {
    const result = await db.query(`DELETE FROM hotels WHERE hotel_id = $1 RETURNING hotel_id`, [id]);
    if (result.rows.length === 0) return { error: 'not_found', message: 'Hotel not found' };
    return { success: true };
  }

  // ── Assignment endpoints ───────────────────────────────────

  async function assignGroup(input: AssignGroupInput): Promise<{ success: boolean } | ValidationError> {
    try {
      await db.query(
        `INSERT INTO traveler_groups (traveler_id, group_id) VALUES ($1, $2)
         ON CONFLICT (traveler_id, group_id) DO NOTHING`,
        [input.traveler_id, input.group_id],
      );
      return { success: true };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23503') {
        return { error: 'validation_error', message: 'Invalid traveler_id or group_id' };
      }
      throw err;
    }
  }

  async function assignHotel(input: AssignHotelInput): Promise<{ success: boolean } | ValidationError> {
    try {
      await db.query(
        `INSERT INTO traveler_hotels (traveler_id, hotel_id) VALUES ($1, $2)
         ON CONFLICT (traveler_id, hotel_id) DO NOTHING`,
        [input.traveler_id, input.hotel_id],
      );
      return { success: true };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23503') {
        return { error: 'validation_error', message: 'Invalid traveler_id or hotel_id' };
      }
      throw err;
    }
  }

  async function assignBus(input: AssignBusInput): Promise<{ success: boolean } | ValidationError> {
    try {
      await db.query(
        `INSERT INTO bus_assignments (traveler_id, bus_id, event_id) VALUES ($1, $2, $3)`,
        [input.traveler_id, input.bus_id, input.event_id],
      );
      return { success: true };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23503') {
        return { error: 'validation_error', message: 'Invalid traveler_id, bus_id, or event_id' };
      }
      throw err;
    }
  }

  // ── Flight CSV import ──────────────────────────────────────

  async function importFlightsCsv(csvContent: string): Promise<ImportResponse> {
    const allErrors: ImportError[] = [];
    const validRows: Array<{ flight_number: string; arrival_time: string; terminal: string | null; traveler_email: string | null }> = [];

    const parsed = Papa.parse<FlightCsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
    });

    if (parsed.errors.length > 0) {
      for (const err of parsed.errors) {
        allErrors.push({ row: (err.row ?? 0) + 1, field: '', reason: err.message });
      }
    }

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNum = i + 1;
      const rowErrors = validateFlightCsvRow(row, rowNum);
      if (rowErrors.length > 0) {
        allErrors.push(...rowErrors);
        continue;
      }
      validRows.push({
        flight_number: row.flight_number!.trim(),
        arrival_time: row.arrival_time!.trim(),
        terminal: row.terminal?.trim() || null,
        traveler_email: row.traveler_email?.trim()?.toLowerCase() || null,
      });
    }

    let imported = 0;
    if (validRows.length > 0) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        for (const row of validRows) {
          const flightResult = await client.query(
            `INSERT INTO flights (flight_number, arrival_time, terminal)
             VALUES ($1, $2, $3)
             RETURNING flight_id`,
            [row.flight_number, row.arrival_time, row.terminal],
          );
          const flightId = flightResult.rows[0].flight_id;

          // If traveler_email is provided, link the flight to the traveler
          if (row.traveler_email) {
            const travelerResult = await client.query(
              `SELECT traveler_id FROM travelers WHERE email_primary = $1`,
              [row.traveler_email],
            );
            if (travelerResult.rows.length > 0) {
              await client.query(
                `INSERT INTO traveler_flights (traveler_id, flight_id) VALUES ($1, $2)
                 ON CONFLICT (traveler_id, flight_id) DO NOTHING`,
                [travelerResult.rows[0].traveler_id, flightId],
              );
            }
          }
          imported++;
        }
        await client.query('COMMIT');
      } catch {
        await client.query('ROLLBACK');
        imported = 0;
      } finally {
        client.release();
      }
    }

    return { imported, errors: allErrors };
  }

  return {
    // Groups
    listGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    // Events
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    // Buses
    listBuses,
    createBus,
    updateBus,
    // Hotels
    listHotels,
    createHotel,
    updateHotel,
    deleteHotel,
    // Assignments
    assignGroup,
    assignHotel,
    assignBus,
    // Flights
    importFlightsCsv,
  };
}

export type AdminEntitiesService = ReturnType<typeof createAdminEntitiesService>;
