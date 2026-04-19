import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { createAuthService } from '../auth.service.js';
import type { EmailService } from '../email.service.js';

const TEST_SECRET = 'test-jwt-secret-for-booking-lookup';

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

function createMockRedis(store: Map<string, string> = new Map()) {
  return {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    incr: vi.fn().mockImplementation((key: string) => {
      const current = parseInt(store.get(key) ?? '0', 10) + 1;
      store.set(key, String(current));
      return Promise.resolve(current);
    }),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
  } as unknown as import('ioredis').default;
}

// ─── Tests ───────────────────────────────────────────────────

describe('AuthService — bookingLookup', () => {
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

  it('should return session_token and traveler_id on successful lookup (Req 2.1)', async () => {
    const db = createMockDb([
      {
        rows: [{
          traveler_id: 'tid-100',
          role_type: 'traveler',
          family_id: 'fam-10',
        }],
      },
    ]);
    const redis = createMockRedis();
    const service = createAuthService({ db, emailService: createMockEmailService(), redis });

    const result = await service.bookingLookup('BK-001', 'Smith', '127.0.0.1');

    expect(result).not.toHaveProperty('error');
    const success = result as { session_token: string; traveler_id: string };
    expect(success.traveler_id).toBe('tid-100');
    expect(success.session_token).toBeDefined();

    // Verify JWT payload
    const payload = jwt.verify(success.session_token, TEST_SECRET) as Record<string, unknown>;
    expect(payload.sub).toBe('tid-100');
    expect(payload.role).toBe('traveler');
    expect(payload.family_id).toBe('fam-10');
  });

  it('should return generic error on mismatch without revealing which field was wrong (Req 2.2)', async () => {
    const db = createMockDb([{ rows: [] }]);
    const redis = createMockRedis();
    const service = createAuthService({ db, emailService: createMockEmailService(), redis });

    const result = await service.bookingLookup('BK-WRONG', 'Smith', '127.0.0.1');

    expect(result).toEqual({
      error: 'invalid_credentials',
      message: 'Invalid booking ID or last name',
    });
  });

  it('should normalize the last name before comparison (Req 2.3)', async () => {
    const db = createMockDb([{ rows: [] }]);
    const redis = createMockRedis();
    const service = createAuthService({ db, emailService: createMockEmailService(), redis });

    await service.bookingLookup('BK-001', '  Müller  ', '127.0.0.1');

    const queryCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    // The normalized name should be trimmed, lowercased, diacritics stripped
    expect(queryCall[1][1]).toBe('muller');
  });

  it('should lock out IP after 5 failures for 30 minutes (Req 2.4)', async () => {
    const redisStore = new Map<string, string>();
    const redis = createMockRedis(redisStore);
    const db = createMockDb([
      { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, // 5 failures
      { rows: [{ traveler_id: 'tid-200', role_type: 'traveler', family_id: null }] }, // would-be success
    ]);
    const service = createAuthService({ db, emailService: createMockEmailService(), redis });
    const ip = '192.168.1.1';

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      const result = await service.bookingLookup('BK-BAD', 'Wrong', ip);
      expect(result).toHaveProperty('error', 'invalid_credentials');
    }

    // 6th attempt should be locked out even with valid credentials
    // Reset db mock to return a match
    const db2 = createMockDb([
      { rows: [{ traveler_id: 'tid-200', role_type: 'traveler', family_id: null }] },
    ]);
    const service2 = createAuthService({ db: db2, emailService: createMockEmailService(), redis });

    const lockedResult = await service2.bookingLookup('BK-001', 'Smith', ip);
    expect(lockedResult).toEqual({
      error: 'invalid_credentials',
      message: 'Invalid booking ID or last name',
    });

    // DB should NOT have been queried since lockout was checked first
    expect(db2.query).not.toHaveBeenCalled();
  });

  it('should clear lockout on successful lookup', async () => {
    const redisStore = new Map<string, string>();
    redisStore.set('lockout:10.0.0.1', '3'); // 3 failures, not yet locked
    const redis = createMockRedis(redisStore);
    const db = createMockDb([
      {
        rows: [{
          traveler_id: 'tid-300',
          role_type: 'traveler',
          family_id: null,
        }],
      },
    ]);
    const service = createAuthService({ db, emailService: createMockEmailService(), redis });

    const result = await service.bookingLookup('BK-002', 'Jones', '10.0.0.1');

    expect(result).not.toHaveProperty('error');
    expect(redis.del).toHaveBeenCalledWith('lockout:10.0.0.1');
  });

  it('should set Redis TTL on first failure', async () => {
    const redis = createMockRedis();
    const db = createMockDb([{ rows: [] }]);
    const service = createAuthService({ db, emailService: createMockEmailService(), redis });

    await service.bookingLookup('BK-BAD', 'Wrong', '10.0.0.2');

    expect(redis.incr).toHaveBeenCalledWith('lockout:10.0.0.2');
    expect(redis.expire).toHaveBeenCalledWith('lockout:10.0.0.2', 1800); // 30 min
  });

  it('should work without Redis (graceful degradation)', async () => {
    const db = createMockDb([
      {
        rows: [{
          traveler_id: 'tid-400',
          role_type: 'traveler',
          family_id: null,
        }],
      },
    ]);
    const service = createAuthService({ db, emailService: createMockEmailService() });

    const result = await service.bookingLookup('BK-003', 'Doe', '127.0.0.1');

    expect(result).not.toHaveProperty('error');
    const success = result as { session_token: string; traveler_id: string };
    expect(success.traveler_id).toBe('tid-400');
  });
});

describe('AuthService — refreshSession', () => {
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

  it('should issue a new JWT with fresh expiry (Req 29.4)', () => {
    const db = createMockDb();
    const service = createAuthService({ db, emailService: createMockEmailService() });

    const originalToken = jwt.sign(
      { sub: 'tid-500', role: 'traveler', family_id: 'fam-50' },
      TEST_SECRET,
      { expiresIn: '1h' },
    );

    const result = service.refreshSession(originalToken);

    expect(result).not.toHaveProperty('error');
    const success = result as { session_token: string; expires_at: string };
    expect(success.session_token).toBeDefined();
    expect(success.expires_at).toBeDefined();

    // New token should have same payload but different signature
    const newPayload = jwt.verify(success.session_token, TEST_SECRET) as Record<string, unknown>;
    expect(newPayload.sub).toBe('tid-500');
    expect(newPayload.role).toBe('traveler');
    expect(newPayload.family_id).toBe('fam-50');
  });

  it('should return error for expired token', () => {
    const db = createMockDb();
    const service = createAuthService({ db, emailService: createMockEmailService() });

    const expiredToken = jwt.sign(
      { sub: 'tid-600', role: 'traveler' },
      TEST_SECRET,
      { expiresIn: '0s' },
    );

    // Small delay to ensure token is expired
    const result = service.refreshSession(expiredToken);

    expect(result).toHaveProperty('error', 'token_expired');
  });

  it('should return error for invalid token', () => {
    const db = createMockDb();
    const service = createAuthService({ db, emailService: createMockEmailService() });

    const result = service.refreshSession('not-a-valid-jwt');

    expect(result).toHaveProperty('error', 'invalid_token');
  });
});

describe('AuthService — logout', () => {
  it('should return void (Req 29.5)', () => {
    const db = createMockDb();
    const service = createAuthService({ db, emailService: createMockEmailService() });

    // logout is a no-op on server side (client removes token)
    expect(() => service.logout()).not.toThrow();
  });
});
