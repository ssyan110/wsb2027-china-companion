import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { ReissueResponse } from '@wsb/shared';

export interface QrServiceDeps {
  db: Pool;
}

export interface ReissueError {
  error: 'not_found' | 'no_active_token';
  message: string;
}

export function createQrService(deps: QrServiceDeps) {
  const { db } = deps;

  async function reissueToken(
    travelerId: string,
    adminId: string,
    adminRole: string,
  ): Promise<ReissueResponse | ReissueError> {
    const client: PoolClient = await db.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch existing active token to capture old hash
      const existingResult = await client.query(
        `SELECT token_id, token_hash FROM qr_tokens
         WHERE traveler_id = $1 AND is_active = true`,
        [travelerId],
      );

      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: 'no_active_token', message: 'No active QR token found for this traveler' };
      }

      const oldTokenHash: string = existingResult.rows[0].token_hash;
      const oldTokenId: string = existingResult.rows[0].token_id;

      // 2. Invalidate existing token
      await client.query(
        `UPDATE qr_tokens SET is_active = false, revoked_at = NOW()
         WHERE token_id = $1`,
        [oldTokenId],
      );

      // 3. Generate new token
      const newTokenValue = crypto.randomBytes(32).toString('base64url');
      const newTokenHash = crypto
        .createHash('sha256')
        .update(newTokenValue)
        .digest('hex');

      // 4. Insert new token (delete old row first to respect UNIQUE constraint on traveler_id)
      await client.query(
        `DELETE FROM qr_tokens WHERE token_id = $1`,
        [oldTokenId],
      );

      await client.query(
        `INSERT INTO qr_tokens (traveler_id, token_value, token_hash, is_active)
         VALUES ($1, $2, $3, true)`,
        [travelerId, newTokenValue, newTokenHash],
      );

      // 5. Log audit event
      await client.query(
        `INSERT INTO audit_logs (actor_id, actor_role, action_type, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          adminId,
          adminRole,
          'qr_reissue',
          'qr_token',
          travelerId,
          JSON.stringify({ old_token_hash: oldTokenHash, new_token_hash: newTokenHash }),
        ],
      );

      await client.query('COMMIT');

      return { new_qr_token_value: newTokenValue };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return { reissueToken };
}

export type QrService = ReturnType<typeof createQrService>;
