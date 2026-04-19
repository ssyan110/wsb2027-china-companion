import type { Pool, PoolClient } from 'pg';
import crypto from 'node:crypto';
import Papa from 'papaparse';
import { normalizeName } from '../utils/normalize-name.js';
import type { RoleType, ImportResponse, ImportError } from '@wsb/shared';
import type { AuditService } from './audit.service.js';

// Local copy of valid role types for runtime validation
// (avoids runtime dependency on @wsb/shared which may not export values in all build configs)
const VALID_ROLE_TYPES: readonly string[] = [
  'traveler', 'minor', 'representative', 'staff', 'staff_desk', 'admin', 'super_admin',
];

// ─── Types ───────────────────────────────────────────────────

export interface AdminServiceDeps {
  db: Pool;
  auditService?: AuditService;
}

export interface TravelerRow {
  traveler_id: string;
  booking_id: string | null;
  family_id: string | null;
  guardian_id: string | null;
  full_name_raw: string;
  full_name_normalized: string;
  email_primary: string;
  role_type: RoleType;
  access_status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTravelerInput {
  full_name: string;
  email: string;
  role_type: RoleType;
  booking_id?: string;
  family_id?: string;
  guardian_id?: string;
  phone?: string;
  passport_name?: string;
}

export interface UpdateTravelerInput {
  // Existing fields
  full_name?: string;
  email?: string;
  role_type?: RoleType;
  booking_id?: string;
  family_id?: string | null;
  guardian_id?: string | null;
  phone?: string | null;
  passport_name?: string | null;
  // New 002-schema fields
  first_name?: string;
  last_name?: string;
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  age?: number;
  invitee_type?: 'invitee' | 'guest';
  registration_type?: string;
  pax_type?: 'adult' | 'child' | 'infant';
  vip_tag?: string | null;
  internal_id?: string | null;
  agent_code?: string | null;
  party_total?: number | null;
  party_adults?: number | null;
  party_children?: number | null;
  dietary_vegan?: boolean;
  dietary_notes?: string | null;
  remarks?: string | null;
  checkin_status?: 'pending' | 'checked_in' | 'no_show';
  onsite_flight_change?: boolean;
  jba_repeat?: boolean;
  smd_name?: string | null;
  ceo_name?: string | null;
}

export interface CsvRowInput {
  full_name?: string;
  email?: string;
  role_type?: string;
  booking_id?: string;
  guardian_id?: string;
  phone?: string;
  passport_name?: string;
  [key: string]: string | undefined;
}

export interface ParsedCsvRow {
  full_name: string;
  email: string;
  role_type: RoleType;
  booking_id: string | null;
  guardian_id: string | null;
  phone: string | null;
  passport_name: string | null;
  normalized_name: string;
  qr_token: string;
  token_hash: string;
}

export interface NotFoundError {
  error: 'not_found';
  message: string;
}

export interface ValidationError {
  error: 'validation_error';
  message: string;
}

export interface Actor {
  id: string;
  role: string;
}

// ─── Email regex (RFC 5322 simplified) ───────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Pure validation functions (exported for property testing) ─

/**
 * Validates a single CSV row and returns an array of errors.
 * Pure function — no side effects.
 */
export function validateCsvRow(
  row: CsvRowInput,
  rowIndex: number,
): ImportError[] {
  const errors: ImportError[] = [];

  // Required: full_name
  if (!row.full_name || row.full_name.trim() === '') {
    errors.push({ row: rowIndex, field: 'full_name', reason: 'full_name is required' });
  }

  // Required: email
  if (!row.email || row.email.trim() === '') {
    errors.push({ row: rowIndex, field: 'email', reason: 'email is required' });
  } else if (!EMAIL_REGEX.test(row.email.trim())) {
    errors.push({ row: rowIndex, field: 'email', reason: 'invalid email format' });
  }

  // Required: role_type
  if (!row.role_type || row.role_type.trim() === '') {
    errors.push({ row: rowIndex, field: 'role_type', reason: 'role_type is required' });
  } else if (!VALID_ROLE_TYPES.includes(row.role_type.trim())) {
    errors.push({
      row: rowIndex,
      field: 'role_type',
      reason: `role_type must be one of: ${VALID_ROLE_TYPES.join(', ')}`,
    });
  }

  // guardian_id required for minors
  if (
    row.role_type &&
    row.role_type.trim() === 'minor' &&
    (!row.guardian_id || row.guardian_id.trim() === '')
  ) {
    errors.push({ row: rowIndex, field: 'guardian_id', reason: 'guardian_id is required for minors' });
  }

  return errors;
}

/**
 * Parses a validated CSV row into a structured object ready for DB insertion.
 * Generates normalized_name, QR token, and token hash.
 * Pure function — no side effects (uses provided token or generates one).
 */
export function parseCsvRow(row: CsvRowInput): ParsedCsvRow {
  const fullName = (row.full_name ?? '').trim();
  const email = (row.email ?? '').trim().toLowerCase();
  const roleType = (row.role_type ?? 'traveler').trim() as RoleType;
  const bookingId = row.booking_id?.trim() || null;
  const guardianId = row.guardian_id?.trim() || null;
  const phone = row.phone?.trim() || null;
  const passportName = row.passport_name?.trim() || null;

  const normalizedName = normalizeName(fullName);
  const qrToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');

  return {
    full_name: fullName,
    email,
    role_type: roleType,
    booking_id: bookingId,
    guardian_id: guardianId,
    phone,
    passport_name: passportName,
    normalized_name: normalizedName,
    qr_token: qrToken,
    token_hash: tokenHash,
  };
}

// ─── Field-to-column mapping for dynamic SET clause building ─

const FIELD_TO_COLUMN: Record<string, string> = {
  full_name: 'full_name_raw',
  email: 'email_primary',
  role_type: 'role_type',
  booking_id: 'booking_id',
  family_id: 'family_id',
  guardian_id: 'guardian_id',
  phone: 'phone',
  passport_name: 'passport_name',
  first_name: 'first_name',
  last_name: 'last_name',
  gender: 'gender',
  age: 'age',
  invitee_type: 'invitee_type',
  registration_type: 'registration_type',
  pax_type: 'pax_type',
  vip_tag: 'vip_tag',
  internal_id: 'internal_id',
  agent_code: 'agent_code',
  party_total: 'party_total',
  party_adults: 'party_adults',
  party_children: 'party_children',
  dietary_vegan: 'dietary_vegan',
  dietary_notes: 'dietary_notes',
  remarks: 'remarks',
  checkin_status: 'checkin_status',
  onsite_flight_change: 'onsite_flight_change',
  jba_repeat: 'jba_repeat',
  smd_name: 'smd_name',
  ceo_name: 'ceo_name',
};

// Exported for testing
export { FIELD_TO_COLUMN };

// ─── Service factory ─────────────────────────────────────────

export function createAdminService(deps: AdminServiceDeps) {
  const { db, auditService } = deps;

  // ── List travelers ──────────────────────────────────────────

  async function listTravelers(): Promise<TravelerRow[]> {
    const result = await db.query(
      `SELECT traveler_id, booking_id, family_id, guardian_id,
              full_name_raw, full_name_normalized, email_primary,
              role_type, access_status, created_at, updated_at
       FROM travelers
       ORDER BY created_at DESC`,
    );
    return result.rows.map(mapTravelerRow);
  }

  // ── Get traveler by ID ─────────────────────────────────────

  async function getTravelerById(id: string): Promise<TravelerRow | NotFoundError> {
    const result = await db.query(
      `SELECT traveler_id, booking_id, family_id, guardian_id,
              full_name_raw, full_name_normalized, email_primary,
              role_type, access_status, created_at, updated_at
       FROM travelers
       WHERE traveler_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    return mapTravelerRow(result.rows[0]);
  }

  // ── Create traveler ────────────────────────────────────────

  async function createTraveler(
    input: CreateTravelerInput,
  ): Promise<TravelerRow | ValidationError> {
    const normalizedName = normalizeName(input.full_name);
    const qrToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const travelerResult = await client.query(
        `INSERT INTO travelers
           (full_name_raw, full_name_normalized, email_primary, role_type,
            booking_id, family_id, guardian_id, phone, passport_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING traveler_id, booking_id, family_id, guardian_id,
                   full_name_raw, full_name_normalized, email_primary,
                   role_type, access_status, created_at, updated_at`,
        [
          input.full_name,
          normalizedName,
          input.email.toLowerCase(),
          input.role_type,
          input.booking_id ?? null,
          input.family_id ?? null,
          input.guardian_id ?? null,
          input.phone ?? null,
          input.passport_name ?? null,
        ],
      );

      const travelerId = travelerResult.rows[0].traveler_id;

      // Create QR token
      await client.query(
        `INSERT INTO qr_tokens (traveler_id, token_value, token_hash, is_active)
         VALUES ($1, $2, $3, true)`,
        [travelerId, qrToken, tokenHash],
      );

      await client.query('COMMIT');
      return mapTravelerRow(travelerResult.rows[0]);
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const pgErr = err as { code?: string; constraint?: string };
      if (pgErr.code === '23505' && pgErr.constraint?.includes('email')) {
        return { error: 'validation_error', message: 'Email already exists' };
      }
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Update traveler (transactional with audit logging) ─────

  async function updateTraveler(
    id: string,
    input: UpdateTravelerInput,
    actor?: Actor,
  ): Promise<TravelerRow | NotFoundError> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic SET clauses for all provided fields
    for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
      const val = (input as Record<string, unknown>)[field];
      if (val === undefined) continue;

      if (field === 'full_name') {
        setClauses.push('full_name_raw = $' + paramIndex++);
        values.push(val);
        setClauses.push('full_name_normalized = $' + paramIndex++);
        values.push(normalizeName(val as string));
      } else if (field === 'email') {
        setClauses.push(column + ' = $' + paramIndex++);
        values.push((val as string).toLowerCase());
      } else {
        setClauses.push(column + ' = $' + paramIndex++);
        values.push(val);
      }
    }

    if (setClauses.length === 0) {
      return getTravelerById(id) as Promise<TravelerRow | NotFoundError>;
    }

    setClauses.push('updated_at = NOW()');

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Fetch current row with FOR UPDATE lock to capture previous values
      const currentResult = await client.query(
        'SELECT * FROM travelers WHERE traveler_id = $1 FOR UPDATE',
        [id],
      );

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: 'not_found', message: 'Traveler not found' };
      }

      const previousRow = currentResult.rows[0] as Record<string, unknown>;

      // Execute the UPDATE
      values.push(id);
      const updateResult = await client.query(
        'UPDATE travelers SET ' + setClauses.join(', ') +
        ' WHERE traveler_id = $' + paramIndex +
        ' RETURNING traveler_id, booking_id, family_id, guardian_id,' +
        ' full_name_raw, full_name_normalized, email_primary,' +
        ' role_type, access_status, created_at, updated_at',
        values,
      );

      // Log granular audit entries for each changed field (fail-closed: within transaction)
      if (actor) {
        for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
          const newVal = (input as Record<string, unknown>)[field];
          if (newVal === undefined) continue;

          // Determine the DB column to compare against for previous value
          const prevColumn = field === 'full_name' ? 'full_name_raw' : column;
          const prevVal = previousRow[prevColumn];

          // Compute the effective new value for comparison
          let effectiveNewVal: unknown = newVal;
          if (field === 'email') {
            effectiveNewVal = (newVal as string).toLowerCase();
          }

          // Only log if the value actually changed
          if (String(prevVal ?? '') === String(effectiveNewVal ?? '')) continue;

          const actionType = field === 'checkin_status'
            ? 'traveler.checkin_update'
            : 'traveler.field_update';

          await client.query(
            'INSERT INTO audit_logs (actor_id, actor_role, action_type, entity_type, entity_id, details)' +
            ' VALUES ($1, $2, $3, $4, $5, $6)',
            [
              actor.id,
              actor.role,
              actionType,
              'traveler',
              id,
              { field, previous_value: prevVal ?? null, new_value: effectiveNewVal ?? null },
            ],
          );
        }
      }

      await client.query('COMMIT');
      return mapTravelerRow(updateResult.rows[0]);
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Deactivate traveler (soft delete) ──────────────────────

  async function deactivateTraveler(id: string): Promise<{ success: boolean } | NotFoundError> {
    const result = await db.query(
      `UPDATE travelers
       SET access_status = 'invited', updated_at = NOW()
       WHERE traveler_id = $1
       RETURNING traveler_id`,
      [id],
    );

    if (result.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    // Revoke active QR tokens
    await db.query(
      `UPDATE qr_tokens
       SET is_active = false, revoked_at = NOW()
       WHERE traveler_id = $1 AND is_active = true`,
      [id],
    );

    return { success: true };
  }

  // ── CSV Import ─────────────────────────────────────────────

  async function importTravelersCsv(csvContent: string): Promise<ImportResponse> {
    const allErrors: ImportError[] = [];
    const validRows: ParsedCsvRow[] = [];

    const parsed = Papa.parse<CsvRowInput>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
    });

    // Collect parse-level errors
    if (parsed.errors.length > 0) {
      for (const err of parsed.errors) {
        allErrors.push({
          row: (err.row ?? 0) + 1,
          field: '',
          reason: err.message,
        });
      }
    }

    // Validate and parse each row
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNum = i + 1; // 1-indexed for user-facing errors

      const rowErrors = validateCsvRow(row, rowNum);
      if (rowErrors.length > 0) {
        allErrors.push(...rowErrors);
        continue;
      }

      validRows.push(parseCsvRow(row));
    }

    // Bulk insert valid rows in a transaction
    let imported = 0;
    if (validRows.length > 0) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        imported = await bulkInsertTravelers(client, validRows);
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
    listTravelers,
    getTravelerById,
    createTraveler,
    updateTraveler,
    deactivateTraveler,
    importTravelersCsv,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

async function bulkInsertTravelers(
  client: PoolClient,
  rows: ParsedCsvRow[],
): Promise<number> {
  let inserted = 0;

  for (const row of rows) {
    const travelerResult = await client.query(
      `INSERT INTO travelers
         (full_name_raw, full_name_normalized, email_primary, role_type,
          booking_id, guardian_id, phone, passport_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING traveler_id`,
      [
        row.full_name,
        row.normalized_name,
        row.email,
        row.role_type,
        row.booking_id,
        row.guardian_id,
        row.phone,
        row.passport_name,
      ],
    );

    const travelerId = travelerResult.rows[0].traveler_id;

    await client.query(
      `INSERT INTO qr_tokens (traveler_id, token_value, token_hash, is_active)
       VALUES ($1, $2, $3, true)`,
      [travelerId, row.qr_token, row.token_hash],
    );

    inserted++;
  }

  return inserted;
}

function mapTravelerRow(row: Record<string, unknown>): TravelerRow {
  return {
    traveler_id: row.traveler_id as string,
    booking_id: (row.booking_id as string) ?? null,
    family_id: (row.family_id as string) ?? null,
    guardian_id: (row.guardian_id as string) ?? null,
    full_name_raw: row.full_name_raw as string,
    full_name_normalized: row.full_name_normalized as string,
    email_primary: row.email_primary as string,
    role_type: row.role_type as RoleType,
    access_status: row.access_status as string,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
