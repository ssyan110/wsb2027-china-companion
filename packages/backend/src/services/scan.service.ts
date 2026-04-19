import type { Pool } from 'pg';
import type {
  ManifestTraveler,
  ManifestResponse,
  ScanMode,
  ScanModesResponse,
  ScanEntry,
  ScanBatchRequest,
} from '@wsb/shared';

export interface ScanServiceDeps {
  db: Pool;
}

export interface InvalidVersionError {
  error: 'invalid_version';
  message: string;
}

/**
 * Build the manifest query — joins travelers with active QR tokens and
 * event_eligibility to produce eligibility arrays per traveler.
 *
 * When a `mode` filter is provided, only travelers eligible for that
 * scan mode (event_id) are returned. When omitted, all travelers with
 * active QR tokens are returned with their full eligibility arrays.
 */
export function createScanService(deps: ScanServiceDeps) {
  const { db } = deps;

  async function getManifest(mode?: string): Promise<ManifestResponse> {
    // 1. Fetch travelers with active QR tokens
    const travelersResult = await db.query(
      `SELECT t.traveler_id, t.full_name_raw, t.family_id, t.role_type,
              q.token_value AS qr_token_value, t.updated_at
       FROM travelers t
       JOIN qr_tokens q ON q.traveler_id = t.traveler_id AND q.is_active = true
       ORDER BY t.updated_at DESC`,
    );

    // 2. Fetch all eligibility mappings (event_id per traveler via groups)
    //    A traveler is eligible for an event if they belong to a group
    //    that appears in event_eligibility for that event, OR the event
    //    has no eligibility rules (open to all).
    const eligibilityResult = await db.query(
      `SELECT DISTINCT tg.traveler_id, ee.event_id
       FROM traveler_groups tg
       JOIN event_eligibility ee ON ee.group_id = tg.group_id`,
    );

    // Also fetch events with no eligibility rules (open to all)
    const openEventsResult = await db.query(
      `SELECT e.event_id FROM events e
       WHERE NOT EXISTS (
         SELECT 1 FROM event_eligibility ee WHERE ee.event_id = e.event_id
       )`,
    );
    const openEventIds: string[] = openEventsResult.rows.map(
      (r: { event_id: string }) => r.event_id,
    );

    // Build eligibility map: traveler_id -> Set<event_id>
    const eligibilityMap = new Map<string, Set<string>>();
    for (const row of eligibilityResult.rows) {
      const tid = row.traveler_id as string;
      if (!eligibilityMap.has(tid)) {
        eligibilityMap.set(tid, new Set());
      }
      eligibilityMap.get(tid)!.add(row.event_id as string);
    }

    // 3. Build manifest travelers
    let travelers: ManifestTraveler[] = travelersResult.rows.map((row) => {
      const tid = row.traveler_id as string;
      const travelerEligibility = eligibilityMap.get(tid) ?? new Set<string>();
      // Add open events to every traveler's eligibility
      const allEligibility = [...travelerEligibility, ...openEventIds];

      return {
        qr_token_value: row.qr_token_value as string,
        traveler_id: tid,
        full_name: row.full_name_raw as string,
        family_id: (row.family_id as string) ?? null,
        role_type: row.role_type as ManifestTraveler['role_type'],
        eligibility: allEligibility,
      };
    });

    // 4. If mode filter is provided, only include travelers eligible for that mode
    if (mode) {
      travelers = travelers.filter((t) => t.eligibility.includes(mode));
    }

    // 5. Compute version as the latest updated_at timestamp
    const version =
      travelersResult.rows.length > 0
        ? new Date(travelersResult.rows[0].updated_at as string).toISOString()
        : new Date().toISOString();

    return { travelers, version };
  }

  async function getDeltaManifest(sinceVersion: string): Promise<ManifestResponse | InvalidVersionError> {
    // Validate sinceVersion is a valid ISO timestamp
    const sinceDate = new Date(sinceVersion);
    if (isNaN(sinceDate.getTime())) {
      return { error: 'invalid_version', message: 'Invalid version format — expected ISO timestamp' };
    }

    // 1. Fetch only travelers updated since the given version
    const travelersResult = await db.query(
      `SELECT t.traveler_id, t.full_name_raw, t.family_id, t.role_type,
              q.token_value AS qr_token_value, t.updated_at
       FROM travelers t
       JOIN qr_tokens q ON q.traveler_id = t.traveler_id AND q.is_active = true
       WHERE t.updated_at > $1
       ORDER BY t.updated_at DESC`,
      [sinceDate.toISOString()],
    );

    if (travelersResult.rows.length === 0) {
      return { travelers: [], version: sinceVersion };
    }

    // 2. Fetch eligibility for changed travelers
    const travelerIds = travelersResult.rows.map((r) => r.traveler_id as string);
    const eligibilityResult = await db.query(
      `SELECT DISTINCT tg.traveler_id, ee.event_id
       FROM traveler_groups tg
       JOIN event_eligibility ee ON ee.group_id = tg.group_id
       WHERE tg.traveler_id = ANY($1)`,
      [travelerIds],
    );

    // Open events
    const openEventsResult = await db.query(
      `SELECT e.event_id FROM events e
       WHERE NOT EXISTS (
         SELECT 1 FROM event_eligibility ee WHERE ee.event_id = e.event_id
       )`,
    );
    const openEventIds: string[] = openEventsResult.rows.map(
      (r: { event_id: string }) => r.event_id,
    );

    // Build eligibility map
    const eligibilityMap = new Map<string, Set<string>>();
    for (const row of eligibilityResult.rows) {
      const tid = row.traveler_id as string;
      if (!eligibilityMap.has(tid)) {
        eligibilityMap.set(tid, new Set());
      }
      eligibilityMap.get(tid)!.add(row.event_id as string);
    }

    const travelers: ManifestTraveler[] = travelersResult.rows.map((row) => {
      const tid = row.traveler_id as string;
      const travelerEligibility = eligibilityMap.get(tid) ?? new Set<string>();
      const allEligibility = [...travelerEligibility, ...openEventIds];

      return {
        qr_token_value: row.qr_token_value as string,
        traveler_id: tid,
        full_name: row.full_name_raw as string,
        family_id: (row.family_id as string) ?? null,
        role_type: row.role_type as ManifestTraveler['role_type'],
        eligibility: allEligibility,
      };
    });

    const version = new Date(travelersResult.rows[0].updated_at as string).toISOString();

    return { travelers, version };
  }

  async function getScanModes(): Promise<ScanModesResponse> {
    // Return events for the current date as available scan modes
    const result = await db.query(
      `SELECT event_id, name, event_type
       FROM events
       WHERE date = CURRENT_DATE
       ORDER BY start_time`,
    );

    const modes: ScanMode[] = result.rows.map((row) => ({
      mode_id: row.event_id as string,
      name: row.name as string,
      event_id: row.event_id as string,
      event_type: row.event_type as ScanMode['event_type'],
    }));

    return { modes };
  }

  async function ingestScanBatch(
    staffId: string,
    request: ScanBatchRequest,
  ): Promise<{ ingested: number; errors: Array<{ index: number; reason: string }> }> {
    const errors: Array<{ index: number; reason: string }> = [];
    const validEntries: Array<{ entry: ScanEntry; index: number }> = [];

    const VALID_RESULTS = ['pass', 'fail', 'wrong_assignment', 'override'] as const;

    for (let i = 0; i < request.scans.length; i++) {
      const entry = request.scans[i];
      const missing: string[] = [];

      if (!entry.qr_token_value) missing.push('qr_token_value');
      if (!entry.scan_mode) missing.push('scan_mode');
      if (!entry.result) missing.push('result');
      if (!entry.device_id) missing.push('device_id');
      if (!entry.scanned_at) missing.push('scanned_at');

      if (missing.length > 0) {
        errors.push({ index: i, reason: `Missing required fields: ${missing.join(', ')}` });
        continue;
      }

      if (!VALID_RESULTS.includes(entry.result as (typeof VALID_RESULTS)[number])) {
        errors.push({ index: i, reason: `Invalid result: ${entry.result}` });
        continue;
      }

      if (entry.result === 'override' && !entry.override_reason) {
        errors.push({ index: i, reason: 'override_reason is required for override results' });
        continue;
      }

      validEntries.push({ entry, index: i });
    }

    if (validEntries.length === 0) {
      return { ingested: 0, errors };
    }

    // Bulk insert valid entries
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const { entry } of validEntries) {
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, NOW())`,
      );
      values.push(
        staffId,
        entry.qr_token_value,
        entry.scan_mode,
        entry.result,
        entry.override_reason ?? null,
        entry.device_id,
        entry.scanned_at,
      );
      paramIndex += 7;
    }

    await db.query(
      `INSERT INTO scan_logs (staff_id, qr_token_value, scan_mode, result, override_reason, device_id, scanned_at, synced_at)
       VALUES ${placeholders.join(', ')}`,
      values,
    );

    return { ingested: validEntries.length, errors };
  }

  return { getManifest, getDeltaManifest, getScanModes, ingestScanBatch };
}

export type ScanService = ReturnType<typeof createScanService>;
