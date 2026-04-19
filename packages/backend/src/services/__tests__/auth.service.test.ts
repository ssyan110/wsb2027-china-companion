import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { createAuthService } from '../auth.service.js';
import type { EmailService } from '../email.service.js';

const TEST_SECRET = 'test-jwt-secret-for-auth-service';

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

function createMockEmailService(): EmailService {
  return {
    sendMagicLink: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('AuthService', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  describe('requestMagicLink', () => {
    it('should return success true when email matches a traveler', async () => {
      const db = createMockDb([
        { rows: [{ traveler_id: 'tid-1' }] },  // SELECT traveler
        { rows: [] },                            // INSERT magic_link
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      const result = await service.requestMagicLink('user@example.com');

      expect(result).toEqual({ success: true });
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(emailSvc.sendMagicLink).toHaveBeenCalledOnce();
      expect(emailSvc.sendMagicLink).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
      );
    });

    it('should return success true even when email does not exist (Req 1.5)', async () => {
      const db = createMockDb([
        { rows: [] },  // SELECT traveler — no match
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      const result = await service.requestMagicLink('nobody@example.com');

      expect(result).toEqual({ success: true });
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(emailSvc.sendMagicLink).not.toHaveBeenCalled();
    });

    it('should store a token with 24h expiry in the database', async () => {
      const db = createMockDb([
        { rows: [{ traveler_id: 'tid-2' }] },
        { rows: [] },
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      await service.requestMagicLink('test@example.com');

      const insertCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO magic_links');
      // Verify expiry is ~24h from now
      const expiresAt = new Date(insertCall[1][2]);
      const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;
      expect(Math.abs(expiresAt.getTime() - expectedExpiry)).toBeLessThan(5000);
    });

    it('should trim and lowercase the email before lookup', async () => {
      const db = createMockDb([{ rows: [] }]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      await service.requestMagicLink('  User@Example.COM  ');

      const selectCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(selectCall[1][0]).toBe('user@example.com');
    });
  });

  describe('verifyMagicLink', () => {
    it('should return invalid for unknown token', async () => {
      const db = createMockDb([{ rows: [] }]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      const result = await service.verifyMagicLink('nonexistent-token');

      expect(result).toEqual({ error: 'invalid' });
    });

    it('should return used for already-used token (Req 1.4)', async () => {
      const db = createMockDb([
        {
          rows: [{
            link_id: 'lid-1',
            traveler_id: 'tid-1',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            used_at: new Date().toISOString(),
            role_type: 'traveler',
            family_id: null,
          }],
        },
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      const result = await service.verifyMagicLink('used-token');

      expect(result).toEqual({ error: 'used' });
    });

    it('should return expired for expired token (Req 1.3)', async () => {
      const db = createMockDb([
        {
          rows: [{
            link_id: 'lid-2',
            traveler_id: 'tid-2',
            expires_at: new Date(Date.now() - 1000).toISOString(),
            used_at: null,
            role_type: 'traveler',
            family_id: null,
          }],
        },
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      const result = await service.verifyMagicLink('expired-token');

      expect(result).toEqual({ error: 'expired' });
    });

    it('should return session_token for valid token', async () => {
      const db = createMockDb([
        {
          rows: [{
            link_id: 'lid-3',
            traveler_id: 'tid-3',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            used_at: null,
            role_type: 'traveler',
            family_id: 'fam-1',
          }],
        },
        { rows: [] },  // UPDATE magic_links SET used_at
        { rows: [] },  // UPDATE travelers SET access_status
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      const result = await service.verifyMagicLink('valid-token');

      expect(result).not.toHaveProperty('error');
      const success = result as { session_token: string; traveler_id: string; role_type: string };
      expect(success.traveler_id).toBe('tid-3');
      expect(success.role_type).toBe('traveler');
      expect(success.session_token).toBeDefined();

      // Verify JWT payload
      const payload = jwt.verify(success.session_token, TEST_SECRET) as Record<string, unknown>;
      expect(payload.sub).toBe('tid-3');
      expect(payload.role).toBe('traveler');
      expect(payload.family_id).toBe('fam-1');
    });

    it('should mark the token as used after successful verification', async () => {
      const db = createMockDb([
        {
          rows: [{
            link_id: 'lid-4',
            traveler_id: 'tid-4',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            used_at: null,
            role_type: 'staff',
            family_id: null,
          }],
        },
        { rows: [] },  // UPDATE magic_links
        { rows: [] },  // UPDATE travelers
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      await service.verifyMagicLink('mark-used-token');

      const updateCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE magic_links SET used_at');
      expect(updateCall[1][0]).toBe('lid-4');
    });

    it('should not include family_id in JWT when null', async () => {
      const db = createMockDb([
        {
          rows: [{
            link_id: 'lid-5',
            traveler_id: 'tid-5',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            used_at: null,
            role_type: 'traveler',
            family_id: null,
          }],
        },
        { rows: [] },
        { rows: [] },
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      const result = await service.verifyMagicLink('no-family-token');

      const success = result as { session_token: string };
      const payload = jwt.verify(success.session_token, TEST_SECRET) as Record<string, unknown>;
      expect(payload).not.toHaveProperty('family_id');
    });

    it('should throw when JWT_SECRET is not configured', async () => {
      delete process.env.JWT_SECRET;

      const db = createMockDb([
        {
          rows: [{
            link_id: 'lid-6',
            traveler_id: 'tid-6',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            used_at: null,
            role_type: 'traveler',
            family_id: null,
          }],
        },
        { rows: [] },
        { rows: [] },
      ]);
      const emailSvc = createMockEmailService();
      const service = createAuthService({ db, emailService: emailSvc });

      await expect(service.verifyMagicLink('no-secret-token')).rejects.toThrow(
        'JWT_SECRET not configured',
      );
    });
  });
});
