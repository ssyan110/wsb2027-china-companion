import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import type { EmailService } from './email.service.js';
import { normalizeName } from '../utils/normalize-name.js';

export interface AuthServiceDeps {
  db: Pool;
  emailService: EmailService;
  redis?: Redis;
}

export interface MagicLinkResult {
  success: boolean;
}

export interface VerifyResult {
  session_token: string;
  traveler_id: string;
  role_type: string;
}

export interface VerifyError {
  error: 'expired' | 'used' | 'invalid';
}

export interface BookingLookupResult {
  session_token: string;
  traveler_id: string;
}

export interface BookingLookupError {
  error: 'invalid_credentials';
  message: string;
}

export interface RefreshResult {
  session_token: string;
  expires_at: string;
}

export interface RefreshError {
  error: 'invalid_token' | 'token_expired';
  message: string;
}

const TOKEN_EXPIRY_HOURS = 24;
const JWT_EXPIRY = '24h';
const LOCKOUT_MAX_FAILURES = 5;
const LOCKOUT_DURATION_SECONDS = 30 * 60; // 30 minutes

export function createAuthService(deps: AuthServiceDeps) {
  const { db, emailService, redis } = deps;

  async function requestMagicLink(email: string): Promise<MagicLinkResult> {
    // Look up traveler by email — always return success regardless
    const travelerResult = await db.query(
      'SELECT traveler_id FROM travelers WHERE email_primary = $1',
      [email.trim().toLowerCase()],
    );

    if (travelerResult.rows.length > 0) {
      const travelerId: string = travelerResult.rows[0].traveler_id;
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      await db.query(
        'INSERT INTO magic_links (traveler_id, token, expires_at) VALUES ($1, $2, $3)',
        [travelerId, token, expiresAt.toISOString()],
      );

      await emailService.sendMagicLink(email, token);
    }

    // Always return success to avoid revealing if email exists (Req 1.5)
    return { success: true };
  }

  async function verifyMagicLink(token: string): Promise<VerifyResult | VerifyError> {
    const result = await db.query(
      `SELECT ml.link_id, ml.traveler_id, ml.expires_at, ml.used_at,
              t.role_type, t.family_id
       FROM magic_links ml
       JOIN travelers t ON t.traveler_id = ml.traveler_id
       WHERE ml.token = $1`,
      [token],
    );

    if (result.rows.length === 0) {
      return { error: 'invalid' };
    }

    const row = result.rows[0];

    if (row.used_at !== null) {
      return { error: 'used' };
    }

    if (new Date(row.expires_at) < new Date()) {
      return { error: 'expired' };
    }

    // Mark as used
    await db.query(
      'UPDATE magic_links SET used_at = NOW() WHERE link_id = $1',
      [row.link_id],
    );

    // Update traveler access status to activated if still invited
    await db.query(
      `UPDATE travelers SET access_status = 'activated', updated_at = NOW()
       WHERE traveler_id = $1 AND access_status = 'invited'`,
      [row.traveler_id],
    );

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const sessionToken = jwt.sign(
      {
        sub: row.traveler_id,
        role: row.role_type,
        ...(row.family_id ? { family_id: row.family_id } : {}),
      },
      secret,
      { expiresIn: JWT_EXPIRY },
    );

    return {
      session_token: sessionToken,
      traveler_id: row.traveler_id,
      role_type: row.role_type,
    };
  }

  async function bookingLookup(
    bookingId: string,
    lastName: string,
    clientIp: string,
  ): Promise<BookingLookupResult | BookingLookupError> {
    // Check IP lockout via Redis
    if (redis) {
      const lockoutKey = `lockout:${clientIp}`;
      const failures = await redis.get(lockoutKey);
      if (failures !== null && parseInt(failures, 10) >= LOCKOUT_MAX_FAILURES) {
        return {
          error: 'invalid_credentials',
          message: 'Invalid booking ID or last name',
        };
      }
    }

    const normalizedLastName = normalizeName(lastName);

    const result = await db.query(
      `SELECT traveler_id, role_type, family_id
       FROM travelers
       WHERE booking_id = $1
         AND full_name_normalized LIKE '%' || $2 || '%'`,
      [bookingId, normalizedLastName],
    );

    if (result.rows.length === 0) {
      // Increment failure count in Redis
      if (redis) {
        const lockoutKey = `lockout:${clientIp}`;
        const current = await redis.incr(lockoutKey);
        if (current === 1) {
          await redis.expire(lockoutKey, LOCKOUT_DURATION_SECONDS);
        }
      }

      return {
        error: 'invalid_credentials',
        message: 'Invalid booking ID or last name',
      };
    }

    const row = result.rows[0];

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Clear lockout on success
    if (redis) {
      const lockoutKey = `lockout:${clientIp}`;
      await redis.del(lockoutKey);
    }

    const sessionToken = jwt.sign(
      {
        sub: row.traveler_id,
        role: row.role_type,
        ...(row.family_id ? { family_id: row.family_id } : {}),
      },
      secret,
      { expiresIn: JWT_EXPIRY },
    );

    return {
      session_token: sessionToken,
      traveler_id: row.traveler_id,
    };
  }

  function refreshSession(existingToken: string): RefreshResult | RefreshError {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    try {
      const payload = jwt.verify(existingToken, secret) as {
        sub: string;
        role: string;
        family_id?: string;
      };

      const newToken = jwt.sign(
        {
          sub: payload.sub,
          role: payload.role,
          ...(payload.family_id ? { family_id: payload.family_id } : {}),
        },
        secret,
        { expiresIn: JWT_EXPIRY },
      );

      const decoded = jwt.decode(newToken) as { exp: number };
      const expiresAt = new Date(decoded.exp * 1000).toISOString();

      return {
        session_token: newToken,
        expires_at: expiresAt,
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return { error: 'token_expired', message: 'Session token has expired' };
      }
      return { error: 'invalid_token', message: 'Invalid session token' };
    }
  }

  function logout(): void {
    // Client-side token removal — no server-side state to invalidate
  }

  return { requestMagicLink, verifyMagicLink, bookingLookup, refreshSession, logout };
}

export type AuthService = ReturnType<typeof createAuthService>;
