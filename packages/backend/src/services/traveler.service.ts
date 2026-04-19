import type { Pool } from 'pg';
import type { TravelerProfile, FamilyResponse, FamilyMember } from '@wsb/shared';

export interface TravelerServiceDeps {
  db: Pool;
}

export interface QrTokenResult {
  token_value: string;
  traveler_name: string;
}

export interface TravelerNotFoundError {
  error: 'not_found';
  message: string;
}

export interface ForbiddenError {
  error: 'forbidden';
  message: string;
}

export function createTravelerService(deps: TravelerServiceDeps) {
  const { db } = deps;

  async function getProfile(travelerId: string): Promise<TravelerProfile | TravelerNotFoundError> {
    // Fetch traveler base data
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
      `SELECT group_id FROM traveler_groups WHERE traveler_id = $1`,
      [travelerId],
    );
    const groupIds: string[] = groupsResult.rows.map((r: { group_id: string }) => r.group_id);

    // Fetch hotel info (take first assignment)
    const hotelResult = await db.query(
      `SELECT h.hotel_id, h.name, h.address_en, h.address_cn
       FROM traveler_hotels th
       JOIN hotels h ON h.hotel_id = th.hotel_id
       WHERE th.traveler_id = $1
       LIMIT 1`,
      [travelerId],
    );
    const hotel = hotelResult.rows.length > 0
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
    const qrToken = qrResult.rows.length > 0 ? (qrResult.rows[0].token_value as string) : '';

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

  async function getQrToken(travelerId: string): Promise<QrTokenResult | TravelerNotFoundError> {
    const result = await db.query(
      `SELECT q.token_value, t.full_name_raw
       FROM qr_tokens q
       JOIN travelers t ON t.traveler_id = q.traveler_id
       WHERE q.traveler_id = $1 AND q.is_active = true
       LIMIT 1`,
      [travelerId],
    );

    if (result.rows.length === 0) {
      return { error: 'not_found', message: 'QR token not found' };
    }

    return {
      token_value: result.rows[0].token_value,
      traveler_name: result.rows[0].full_name_raw,
    };
  }

  async function getFamily(travelerId: string): Promise<FamilyResponse | ForbiddenError | TravelerNotFoundError> {
    // Fetch the requesting traveler's role_type and family_id
    const travelerResult = await db.query(
      `SELECT role_type, family_id FROM travelers WHERE traveler_id = $1`,
      [travelerId],
    );

    if (travelerResult.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    const traveler = travelerResult.rows[0];

    if (traveler.role_type !== 'representative') {
      return { error: 'forbidden', message: 'Only family representatives can access family data' };
    }

    if (!traveler.family_id) {
      return { error: 'not_found', message: 'No family linked' };
    }

    const familyId: string = traveler.family_id;

    // Fetch all members with that family_id
    const membersResult = await db.query(
      `SELECT t.traveler_id, t.full_name_raw, t.role_type
       FROM travelers t
       WHERE t.family_id = $1`,
      [familyId],
    );

    // For each member, fetch their active QR token
    const members: FamilyMember[] = [];
    for (const row of membersResult.rows) {
      const qrResult = await db.query(
        `SELECT token_value FROM qr_tokens
         WHERE traveler_id = $1 AND is_active = true
         LIMIT 1`,
        [row.traveler_id],
      );

      members.push({
        traveler_id: row.traveler_id,
        full_name: row.full_name_raw,
        role_type: row.role_type,
        qr_token_value: qrResult.rows.length > 0 ? qrResult.rows[0].token_value : '',
      });
    }

    return { family_id: familyId, members };
  }

  return { getProfile, getQrToken, getFamily };
}

export type TravelerService = ReturnType<typeof createTravelerService>;
