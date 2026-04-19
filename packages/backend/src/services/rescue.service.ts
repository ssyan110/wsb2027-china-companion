import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { SearchResponse, SearchCandidate, TravelerProfile } from '@wsb/shared';
import type { EmailService } from './email.service.js';
import type { AuditService } from './audit.service.js';
import { normalizeName } from '../utils/normalize-name.js';

// ─── Types ───────────────────────────────────────────────────

export interface RescueServiceDeps {
  db: Pool;
  emailService: EmailService;
  auditService: AuditService;
}

export interface ValidationError {
  error: 'validation_error';
  message: string;
}

export interface NotFoundError {
  error: 'not_found';
  message: string;
}

export interface ResendResult {
  success: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const MIN_NAME_QUERY_LENGTH = 2;
const MIN_EMAIL_QUERY_LENGTH = 3;
const MAX_RESULTS = 20;
const SIMILARITY_THRESHOLD = 0.2;
const TOKEN_EXPIRY_HOURS = 24;

// ─── Service Factory ─────────────────────────────────────────

export function createRescueService(deps: RescueServiceDeps) {
  const { db, emailService, auditService } = deps;

  /**
   * Fuzzy search for travelers by name or email.
   * Requirements: 3.1, 3.2, 3.3, 31.5
   */
  async function search(
    query: string,
    type: 'name' | 'email',
    staffId: string,
  ): Promise<SearchResponse | ValidationError> {
    const trimmedQuery = query.trim();

    if (type === 'name' && trimmedQuery.length < MIN_NAME_QUERY_LENGTH) {
      return {
        error: 'validation_error',
        message: `Name search requires at least ${MIN_NAME_QUERY_LENGTH} characters`,
      };
    }

    if (type === 'email' && trimmedQuery.length < MIN_EMAIL_QUERY_LENGTH) {
      return {
        error: 'validation_error',
        message: `Email search requires at least ${MIN_EMAIL_QUERY_LENGTH} characters`,
      };
    }

    let candidates: SearchCandidate[];

    if (type === 'name') {
      const normalizedQuery = normalizeName(trimmedQuery);
      const result = await db.query(
        `SELECT t.traveler_id, t.full_name_raw, t.email_primary, t.booking_id,
                t.family_id, t.access_status,
                similarity(t.full_name_normalized, $1) AS match_score
         FROM travelers t
         WHERE similarity(t.full_name_normalized, $1) > $2
         ORDER BY match_score DESC
         LIMIT $3`,
        [normalizedQuery, SIMILARITY_THRESHOLD, MAX_RESULTS],
      );
      candidates = mapCandidates(result.rows);
    } else {
      const lowerQuery = trimmedQuery.toLowerCase();
      const result = await db.query(
        `SELECT t.traveler_id, t.full_name_raw, t.email_primary, t.booking_id,
                t.family_id, t.access_status,
                similarity(t.email_primary, $1) AS match_score
         FROM travelers t
         WHERE t.email_primary LIKE $1 || '%' OR similarity(t.email_primary, $1) > $2
         ORDER BY match_score DESC
         LIMIT $3`,
        [lowerQuery, SIMILARITY_THRESHOLD, MAX_RESULTS],
      );
      candidates = mapCandidates(result.rows);
    }

    // Log the search action (Req 3.6, 20.7)
    await auditService.logAuditEvent({
      actor_id: staffId,
      actor_role: 'staff_desk',
      action_type: 'rescue_search',
      entity_type: 'traveler',
      entity_id: staffId,
      details: { query: trimmedQuery, type, result_count: candidates.length },
    });

    return { candidates };
  }

  /**
   * Resend a magic link for a traveler.
   * Requirements: 3.5, 20.5, 31.6
   */
  async function resendMagicLink(
    travelerId: string,
    staffId: string,
  ): Promise<ResendResult | NotFoundError> {
    const travelerResult = await db.query(
      'SELECT traveler_id, email_primary FROM travelers WHERE traveler_id = $1',
      [travelerId],
    );

    if (travelerResult.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    const email: string = travelerResult.rows[0].email_primary;

    // Generate a new magic link token
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO magic_links (traveler_id, token, expires_at) VALUES ($1, $2, $3)',
      [travelerId, token, expiresAt.toISOString()],
    );

    await emailService.sendMagicLink(email, token);

    // Update access_status to 'rescued' (Req 20.5)
    await db.query(
      `UPDATE travelers SET access_status = 'rescued', updated_at = NOW()
       WHERE traveler_id = $1`,
      [travelerId],
    );

    // Log the resend action (Req 3.6, 20.7)
    await auditService.logAuditEvent({
      actor_id: staffId,
      actor_role: 'staff_desk',
      action_type: 'rescue_resend_magic_link',
      entity_type: 'traveler',
      entity_id: travelerId,
      details: { traveler_id: travelerId },
    });

    return { success: true };
  }

  /**
   * Get full traveler profile with QR token for staff display.
   * Requirements: 3.4, 20.4, 31.7
   */
  async function getTravelerProfile(
    travelerId: string,
    staffId: string,
  ): Promise<TravelerProfile | NotFoundError> {
    const travelerResult = await db.query(
      `SELECT t.traveler_id, t.full_name_raw, t.email_primary, t.role_type,
              t.access_status, t.family_id
       FROM travelers t
       WHERE t.traveler_id = $1`,
      [travelerId],
    );

    if (travelerResult.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    const traveler = travelerResult.rows[0];

    // Fetch group_ids
    const groupsResult = await db.query(
      'SELECT group_id FROM traveler_groups WHERE traveler_id = $1',
      [travelerId],
    );
    const groupIds: string[] = groupsResult.rows.map(
      (r: { group_id: string }) => r.group_id,
    );

    // Fetch hotel info
    const hotelResult = await db.query(
      `SELECT h.hotel_id, h.name, h.address_en, h.address_cn
       FROM traveler_hotels th
       JOIN hotels h ON h.hotel_id = th.hotel_id
       WHERE th.traveler_id = $1
       LIMIT 1`,
      [travelerId],
    );
    const hotel =
      hotelResult.rows.length > 0
        ? {
            hotel_id: hotelResult.rows[0].hotel_id as string,
            name: hotelResult.rows[0].name as string,
            address_en: hotelResult.rows[0].address_en as string,
            address_cn: hotelResult.rows[0].address_cn as string,
          }
        : null;

    // Fetch active QR token
    const qrResult = await db.query(
      `SELECT token_value FROM qr_tokens
       WHERE traveler_id = $1 AND is_active = true
       LIMIT 1`,
      [travelerId],
    );
    const qrToken =
      qrResult.rows.length > 0 ? (qrResult.rows[0].token_value as string) : '';

    // Log the profile view action (Req 3.6, 20.7)
    await auditService.logAuditEvent({
      actor_id: staffId,
      actor_role: 'staff_desk',
      action_type: 'rescue_view_profile',
      entity_type: 'traveler',
      entity_id: travelerId,
      details: { traveler_id: travelerId },
    });

    return {
      traveler_id: traveler.traveler_id,
      full_name: traveler.full_name_raw,
      email: traveler.email_primary,
      role_type: traveler.role_type,
      access_status: traveler.access_status,
      family_id: traveler.family_id ?? null,
      group_ids: groupIds,
      hotel,
      qr_token: qrToken,
    };
  }

  return { search, resendMagicLink, getTravelerProfile };
}

// ─── Helpers ─────────────────────────────────────────────────

function mapCandidates(
  rows: Array<Record<string, unknown>>,
): SearchCandidate[] {
  return rows.map((row) => ({
    traveler_id: row.traveler_id as string,
    full_name: row.full_name_raw as string,
    email: row.email_primary as string,
    booking_id: (row.booking_id as string) ?? '',
    family_id: (row.family_id as string) ?? null,
    access_status: row.access_status as SearchCandidate['access_status'],
    match_score: parseFloat(String(row.match_score)),
  }));
}

export type RescueService = ReturnType<typeof createRescueService>;
