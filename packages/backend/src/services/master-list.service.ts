import type { Pool } from 'pg';
import type {
  MasterListQueryParams,
  ExtendedMasterListQueryParams,
  MasterListRow,
  ExtendedMasterListRow,
  RoomAssignment,
  FlightDetail,
  EventAttendanceItem,
  MasterListResponse,
  RoleType,
} from '@wsb/shared';
import type { AuditService } from './audit.service.js';
import { applyMasking } from '../utils/field-masker.js';
import { projectFieldsByRole } from '../utils/field-projection.js';
import {
  validateSortColumn,
  sanitizeSortOrder,
  computePagination,
} from '../utils/query-validators.js';

// ─── Types ───────────────────────────────────────────────────

export interface MasterListServiceDeps {
  db: Pool;
  auditService: AuditService;
}

// ─── SQL CTE ─────────────────────────────────────────────────

const BASE_CTE = `
WITH traveler_groups_agg AS (
  SELECT tg.traveler_id, array_agg(g.name ORDER BY g.name) AS groups
  FROM traveler_groups tg JOIN groups g ON tg.group_id = g.group_id
  GROUP BY tg.traveler_id
),
traveler_hotels_agg AS (
  SELECT th.traveler_id, array_agg(h.name ORDER BY h.name) AS hotels
  FROM traveler_hotels th JOIN hotels h ON th.hotel_id = h.hotel_id
  GROUP BY th.traveler_id
),
room_assignments_agg AS (
  SELECT ra.traveler_id,
         json_build_object(
           'room_number', ra.room_number,
           'room_assignment_seq', ra.room_assignment_seq,
           'hotel_confirmation_no', ra.hotel_confirmation_no,
           'occupancy', ra.occupancy,
           'paid_room_type', ra.paid_room_type,
           'preferred_roommates', ra.preferred_roommates,
           'is_paid_room', ra.is_paid_room,
           'hotel_name', h.name
         ) AS room_assignment
  FROM room_assignments ra
  JOIN hotels h ON ra.hotel_id = h.hotel_id
),
arrival_flight_agg AS (
  SELECT tf.traveler_id,
         json_build_object(
           'airline', f.airline,
           'flight_number', f.flight_number,
           'time', f.arrival_time,
           'airport', f.airport,
           'terminal', f.terminal
         ) AS arrival_flight
  FROM traveler_flights tf
  JOIN flights f ON tf.flight_id = f.flight_id
  WHERE tf.direction = 'arrival'
),
departure_flight_agg AS (
  SELECT tf.traveler_id,
         json_build_object(
           'airline', f.airline,
           'flight_number', f.flight_number,
           'time', f.departure_time,
           'airport', f.airport,
           'terminal', f.terminal
         ) AS departure_flight
  FROM traveler_flights tf
  JOIN flights f ON tf.flight_id = f.flight_id
  WHERE tf.direction = 'departure'
),
event_attendance_agg AS (
  SELECT ea.traveler_id,
         json_agg(
           json_build_object(
             'event_name', e.name,
             'fleet_number', ea.fleet_number,
             'attended', ea.attended
           ) ORDER BY e.date
         ) AS event_attendance
  FROM event_attendance ea
  JOIN events e ON ea.event_id = e.event_id
  GROUP BY ea.traveler_id
),
traveler_flights_agg AS (
  SELECT tf.traveler_id,
         json_agg(json_build_object('flight_number', f.flight_number, 'arrival_time', f.arrival_time) ORDER BY f.arrival_time) AS flights
  FROM traveler_flights tf JOIN flights f ON tf.flight_id = f.flight_id
  GROUP BY tf.traveler_id
),
traveler_buses_agg AS (
  SELECT ba.traveler_id,
         json_agg(json_build_object('bus_number', b.bus_number, 'event_name', e.name) ORDER BY e.date) AS bus_assignments
  FROM bus_assignments ba
  JOIN buses b ON ba.bus_id = b.bus_id
  JOIN events e ON ba.event_id = e.event_id
  GROUP BY ba.traveler_id
),
traveler_qr AS (
  SELECT traveler_id, bool_or(is_active) AS qr_active
  FROM qr_tokens
  GROUP BY traveler_id
)`;

const SELECT_COLUMNS = `
  t.traveler_id, t.booking_id, t.family_id, t.representative_id, t.guardian_id,
  t.full_name_raw, t.full_name_normalized, t.email_primary, t.email_aliases,
  t.passport_name, t.phone, t.role_type, t.access_status, t.created_at, t.updated_at,
  t.first_name, t.last_name, t.gender, t.age, t.invitee_type, t.registration_type,
  t.pax_type, t.vip_tag, t.internal_id, t.agent_code,
  t.party_total, t.party_adults, t.party_children,
  t.dietary_vegan, t.dietary_notes, t.remarks,
  t.repeat_attendee, t.jba_repeat, t.checkin_status, t.onsite_flight_change,
  t.smd_name, t.ceo_name, t.photo_url,
  COALESCE(tga.groups, '{}') AS groups,
  COALESCE(tha.hotels, '{}') AS hotels,
  raa.room_assignment,
  afa.arrival_flight,
  dfa.departure_flight,
  COALESCE(eaa.event_attendance, '[]'::json) AS event_attendance,
  COALESCE(tfa.flights, '[]'::json) AS flights,
  COALESCE(tba.bus_assignments, '[]'::json) AS bus_assignments,
  COALESCE(tqr.qr_active, false) AS qr_active`;

const FROM_JOINS = `
FROM travelers t
LEFT JOIN traveler_groups_agg tga ON t.traveler_id = tga.traveler_id
LEFT JOIN traveler_hotels_agg tha ON t.traveler_id = tha.traveler_id
LEFT JOIN room_assignments_agg raa ON t.traveler_id = raa.traveler_id
LEFT JOIN arrival_flight_agg afa ON t.traveler_id = afa.traveler_id
LEFT JOIN departure_flight_agg dfa ON t.traveler_id = dfa.traveler_id
LEFT JOIN event_attendance_agg eaa ON t.traveler_id = eaa.traveler_id
LEFT JOIN traveler_flights_agg tfa ON t.traveler_id = tfa.traveler_id
LEFT JOIN traveler_buses_agg tba ON t.traveler_id = tba.traveler_id
LEFT JOIN traveler_qr tqr ON t.traveler_id = tqr.traveler_id`;

// ─── Helpers ─────────────────────────────────────────────────

export interface WhereClause {
  conditions: string[];
  values: unknown[];
}

/** Helper to produce a PostgreSQL positional parameter like $1, $2, etc. */
function param(idx: number): string {
  return '$' + idx;
}

export function buildWhereClause(params: MasterListQueryParams | ExtendedMasterListQueryParams): WhereClause {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.q) {
    const p = param(idx);
    conditions.push(
      '(t.full_name_normalized ILIKE ' + p +
      ' OR t.email_primary ILIKE ' + p +
      ' OR t.booking_id ILIKE ' + p +
      ' OR t.phone ILIKE ' + p + ')',
    );
    values.push('%' + params.q + '%');
    idx++;
  }

  if (params.role_type) {
    conditions.push('t.role_type = ' + param(idx) + '::role_type');
    values.push(params.role_type);
    idx++;
  }

  if (params.access_status) {
    conditions.push('t.access_status = ' + param(idx) + '::access_status');
    values.push(params.access_status);
    idx++;
  }

  if (params.group_id) {
    conditions.push(
      'EXISTS (SELECT 1 FROM traveler_groups tg_f WHERE tg_f.traveler_id = t.traveler_id AND tg_f.group_id = ' +
      param(idx) + '::uuid)',
    );
    values.push(params.group_id);
    idx++;
  }

  if (params.hotel_id) {
    conditions.push(
      'EXISTS (SELECT 1 FROM traveler_hotels th_f WHERE th_f.traveler_id = t.traveler_id AND th_f.hotel_id = ' +
      param(idx) + '::uuid)',
    );
    values.push(params.hotel_id);
    idx++;
  }

  // Extended filter parameters (from ExtendedMasterListQueryParams)
  const ext = params as ExtendedMasterListQueryParams;

  if (ext.invitee_type) {
    conditions.push('t.invitee_type = ' + param(idx));
    values.push(ext.invitee_type);
    idx++;
  }

  if (ext.pax_type) {
    conditions.push('t.pax_type = ' + param(idx));
    values.push(ext.pax_type);
    idx++;
  }

  if (ext.checkin_status) {
    conditions.push('t.checkin_status = ' + param(idx));
    values.push(ext.checkin_status);
    idx++;
  }

  if (ext.vip_tag) {
    conditions.push('t.vip_tag = ' + param(idx));
    values.push(ext.vip_tag);
    idx++;
  }

  if (ext.agent_code) {
    conditions.push('t.agent_code = ' + param(idx));
    values.push(ext.agent_code);
    idx++;
  }

  return { conditions, values };
}

/**
 * Converts a cell value to a string suitable for CSV output.
 * Arrays and objects are JSON-stringified; nulls become empty strings.
 */
function formatCsvCell(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Escapes a CSV value per RFC 4180: if the value contains a comma,
 * double-quote, or newline, wrap it in double-quotes and escape
 * internal double-quotes by doubling them.
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Parse a JSON column from a database row.
 * pg may return it as a string or already-parsed object.
 */
function parseJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return value as T;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch { return []; }
  }
  return Array.isArray(value) ? value as T[] : [];
}

function mapRow(row: Record<string, unknown>): ExtendedMasterListRow {
  return {
    traveler_id: row.traveler_id as string,
    booking_id: row.booking_id as string | null,
    family_id: row.family_id as string | null,
    representative_id: row.representative_id as string | null,
    guardian_id: row.guardian_id as string | null,
    full_name_raw: row.full_name_raw as string,
    full_name_normalized: row.full_name_normalized as string,
    email_primary: row.email_primary as string,
    email_aliases: row.email_aliases as string[] | null,
    passport_name: row.passport_name as string | null,
    phone: row.phone as string | null,
    role_type: row.role_type as RoleType,
    access_status: row.access_status as string as MasterListRow['access_status'],
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    groups: (row.groups ?? []) as string[],
    hotels: (row.hotels ?? []) as string[],
    flights: (row.flights ?? []) as MasterListRow['flights'],
    bus_assignments: (row.bus_assignments ?? []) as MasterListRow['bus_assignments'],
    qr_active: Boolean(row.qr_active),

    // 002-schema scalar fields
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    gender: (row.gender as ExtendedMasterListRow['gender']) ?? null,
    age: row.age != null ? Number(row.age) : null,
    invitee_type: (row.invitee_type as ExtendedMasterListRow['invitee_type']) ?? null,
    registration_type: (row.registration_type as string | null) ?? null,
    pax_type: (row.pax_type as ExtendedMasterListRow['pax_type']) ?? 'adult',
    vip_tag: (row.vip_tag as string | null) ?? null,
    internal_id: (row.internal_id as string | null) ?? null,
    agent_code: (row.agent_code as string | null) ?? null,
    party_total: row.party_total != null ? Number(row.party_total) : null,
    party_adults: row.party_adults != null ? Number(row.party_adults) : null,
    party_children: row.party_children != null ? Number(row.party_children) : null,
    dietary_vegan: Boolean(row.dietary_vegan),
    dietary_notes: (row.dietary_notes as string | null) ?? null,
    remarks: (row.remarks as string | null) ?? null,
    repeat_attendee: row.repeat_attendee != null ? Number(row.repeat_attendee) : 0,
    jba_repeat: Boolean(row.jba_repeat),
    checkin_status: (row.checkin_status as ExtendedMasterListRow['checkin_status']) ?? 'pending',
    onsite_flight_change: Boolean(row.onsite_flight_change),
    smd_name: (row.smd_name as string | null) ?? null,
    ceo_name: (row.ceo_name as string | null) ?? null,
    photo_url: (row.photo_url as string | null) ?? null,

    // Aggregated related data (JSON columns)
    room_assignment: parseJson<RoomAssignment>(row.room_assignment),
    arrival_flight: parseJson<FlightDetail>(row.arrival_flight),
    departure_flight: parseJson<FlightDetail>(row.departure_flight),
    event_attendance: parseJsonArray<EventAttendanceItem>(row.event_attendance),
  };
}

// ─── Service Factory ─────────────────────────────────────────

export function createMasterListService(deps: MasterListServiceDeps) {
  const { db, auditService } = deps;

  /**
   * Query the master list with search, filter, sort, pagination,
   * PII masking, and role-based field projection.
   */
  async function query(
    params: MasterListQueryParams,
    actor: { id: string; role: RoleType },
  ): Promise<MasterListResponse> {
    // 1. Build dynamic WHERE clause
    const { conditions, values } = buildWhereClause(params);
    const whereSQL = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 2. COUNT query for total
    const countSQL = BASE_CTE + ' SELECT COUNT(*)::int AS total ' + FROM_JOINS + ' ' + whereSQL;
    const countResult = await db.query(countSQL, values);
    const total: number = countResult.rows[0].total;

    // 3. Pagination
    const { page, page_size, total_pages, offset } = computePagination(params, total);

    // 4. Validate sort column
    const sortCol =
      params.sort_by && validateSortColumn(params.sort_by)
        ? params.sort_by
        : 'created_at';
    const sortDir = sanitizeSortOrder(params.sort_order);

    // 5. Build paginated data query
    const nextIdx = values.length + 1;
    const dataSQL =
      BASE_CTE + ' SELECT ' + SELECT_COLUMNS + ' ' + FROM_JOINS + ' ' + whereSQL +
      ' ORDER BY t.' + sortCol + ' ' + sortDir +
      ' LIMIT ' + param(nextIdx) + ' OFFSET ' + param(nextIdx + 1);
    const dataValues = [...values, page_size, offset];
    const dataResult = await db.query(dataSQL, dataValues);

    // 6. Map rows, apply masking, then project fields
    const shouldUnmask = actor.role === 'super_admin' && params.unmask === true;
    const data = dataResult.rows.map((row) => {
      const mapped = mapRow(row);
      const masked = applyMasking(mapped, shouldUnmask);
      return projectFieldsByRole(masked, actor.role) as MasterListRow;
    });

    // 7. Audit log BEFORE returning response (fail closed)
    const actionType = shouldUnmask ? 'master_list.view_unmasked' : 'master_list.view';
    await auditService.logAuditEvent({
      actor_id: actor.id,
      actor_role: actor.role,
      action_type: actionType,
      entity_type: 'traveler_list',
      entity_id: null as unknown as string,
      details: {
        filters: {
          role_type: params.role_type ?? null,
          access_status: params.access_status ?? null,
          group_id: params.group_id ?? null,
          hotel_id: params.hotel_id ?? null,
        },
        search: params.q ?? null,
        page,
        sort: { sort_by: sortCol, sort_order: sortDir },
      },
    });

    return { data, total, page, page_size, total_pages };
  }

  /**
   * Stream master list rows as CSV lines, applying the same masking
   * and projection rules as `query`.
   *
   * Uses LIMIT/OFFSET batching (batch size 100) to avoid loading the
   * entire result set into memory at once.
   */
  async function* exportCsv(
    params: MasterListQueryParams,
    actor: { id: string; role: RoleType },
  ): AsyncGenerator<string> {
    const BATCH_SIZE = 100;

    // 1. Build WHERE clause (reuse same logic as query)
    const { conditions, values } = buildWhereClause(params);
    const whereSQL = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 2. Validate sort
    const sortCol =
      params.sort_by && validateSortColumn(params.sort_by)
        ? params.sort_by
        : 'created_at';
    const sortDir = sanitizeSortOrder(params.sort_order);

    // 3. Determine masking
    const shouldUnmask = actor.role === 'super_admin' && params.unmask === true;

    // 4. Determine CSV columns by projecting a dummy row to discover keys
    //    (admin role omits email_aliases and guardian_id)
    const allColumns: (keyof ExtendedMasterListRow)[] = [
      'traveler_id', 'booking_id', 'family_id', 'representative_id', 'guardian_id',
      'full_name_raw', 'full_name_normalized', 'email_primary', 'email_aliases',
      'passport_name', 'phone', 'role_type', 'access_status', 'created_at', 'updated_at',
      'first_name', 'last_name', 'gender', 'age', 'invitee_type', 'registration_type',
      'pax_type', 'vip_tag', 'internal_id', 'agent_code',
      'party_total', 'party_adults', 'party_children',
      'dietary_vegan', 'dietary_notes', 'remarks',
      'repeat_attendee', 'jba_repeat', 'checkin_status', 'onsite_flight_change',
      'smd_name', 'ceo_name', 'photo_url',
      'groups', 'hotels', 'room_assignment', 'arrival_flight', 'departure_flight',
      'event_attendance', 'flights', 'bus_assignments', 'qr_active',
    ];
    const csvColumns = actor.role === 'super_admin'
      ? allColumns
      : allColumns.filter((c) => c !== 'email_aliases' && c !== 'guardian_id');

    // 5. COUNT query for audit log record_count (before yielding any data)
    const countSQL = BASE_CTE + ' SELECT COUNT(*)::int AS total ' + FROM_JOINS + ' ' + whereSQL;
    const countResult = await db.query(countSQL, values);
    const recordCount: number = countResult.rows[0].total;

    // 6. Audit log BEFORE yielding any CSV data (fail closed)
    await auditService.logAuditEvent({
      actor_id: actor.id,
      actor_role: actor.role,
      action_type: 'master_list.export',
      entity_type: 'traveler_list',
      entity_id: null as unknown as string,
      details: {
        filters: {
          role_type: params.role_type ?? null,
          access_status: params.access_status ?? null,
          group_id: params.group_id ?? null,
          hotel_id: params.hotel_id ?? null,
        },
        search: params.q ?? null,
        record_count: recordCount,
      },
    });

    // 7. Yield CSV header line
    yield csvColumns.map(escapeCsvValue).join(',') + '\n';

    // 8. Batch-fetch rows using LIMIT/OFFSET
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const nextIdx = values.length + 1;
      const batchSQL =
        BASE_CTE + ' SELECT ' + SELECT_COLUMNS + ' ' + FROM_JOINS + ' ' + whereSQL +
        ' ORDER BY t.' + sortCol + ' ' + sortDir +
        ' LIMIT ' + param(nextIdx) + ' OFFSET ' + param(nextIdx + 1);
      const batchValues = [...values, BATCH_SIZE, offset];
      const result = await db.query(batchSQL, batchValues);

      for (const raw of result.rows) {
        const mapped = mapRow(raw);
        const masked = applyMasking(mapped, shouldUnmask);
        const projected = projectFieldsByRole(masked, actor.role) as Record<string, unknown>;

        const csvLine = csvColumns.map((col) => {
          const val = projected[col];
          return escapeCsvValue(formatCsvCell(val));
        }).join(',') + '\n';

        yield csvLine;
      }

      if (result.rows.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }
  }

  return { query, exportCsv };
}

export type MasterListService = ReturnType<typeof createMasterListService>;
