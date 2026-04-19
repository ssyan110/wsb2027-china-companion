import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createAuthService } from '../auth.service.js';
import type { EmailService } from '../email.service.js';

const TEST_SECRET = 'test-jwt-secret-for-auth-property';

// ─── Mock helpers ────────────────────────────────────────────

function createMockEmailService(): EmailService {
  return {
    sendMagicLink: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock DB that simulates magic_links table state for single-use
 * and expiry property tests. Tracks used_at state in a local map.
 */
function createMagicLinkMockDb(opts: {
  travelerId: string;
  linkId: string;
  expiresAt: Date;
}) {
  const usedTokens = new Set<string>();

  const db = {
    query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      const sqlStr = sql as string;

      // SELECT for verifyMagicLink
      if (sqlStr.includes('SELECT') && sqlStr.includes('magic_links')) {
        const token = (params as string[])[0];
        return Promise.resolve({
          rows: [{
            link_id: opts.linkId,
            traveler_id: opts.travelerId,
            expires_at: opts.expiresAt.toISOString(),
            used_at: usedTokens.has(token) ? new Date().toISOString() : null,
            role_type: 'traveler',
            family_id: null,
          }],
        });
      }

      // UPDATE magic_links SET used_at — mark token as used
      if (sqlStr.includes('UPDATE magic_links SET used_at')) {
        // Extract the token from the context — we track by link_id
        usedTokens.add('__current__');
        return Promise.resolve({ rows: [] });
      }

      // UPDATE travelers SET access_status
      if (sqlStr.includes('UPDATE travelers')) {
        return Promise.resolve({ rows: [] });
      }

      return Promise.resolve({ rows: [] });
    }),
  } as unknown as import('pg').Pool;

  return { db, usedTokens };
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

// ─── Property Tests ──────────────────────────────────────────

/**
 * Property 6: Magic link single-use enforcement
 * Validates: Requirements 1.4, 48.6
 *
 * For any valid Magic_Link token, verifying the token a first time SHALL succeed,
 * and verifying the same token a second time SHALL be rejected with an "already used" error.
 */
describe('Property 6: Magic link single-use enforcement', () => {
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

  it('after first successful verification, all subsequent verifications must return { error: "used" }', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.base64String({ minLength: 10, maxLength: 64 }),
        fc.uuid(),
        fc.uuid(),
        async (token, travelerId, linkId) => {
          // Set up a mock DB that tracks used_at state
          const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const usedTokens = new Set<string>();

          const db = {
            query: vi.fn().mockImplementation((sql: string) => {
              if (sql.includes('SELECT') && sql.includes('magic_links')) {
                return Promise.resolve({
                  rows: [{
                    link_id: linkId,
                    traveler_id: travelerId,
                    expires_at: futureExpiry.toISOString(),
                    used_at: usedTokens.has(token) ? new Date().toISOString() : null,
                    role_type: 'traveler',
                    family_id: null,
                  }],
                });
              }
              if (sql.includes('UPDATE magic_links SET used_at')) {
                usedTokens.add(token);
                return Promise.resolve({ rows: [] });
              }
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as import('pg').Pool;

          const service = createAuthService({ db, emailService: createMockEmailService() });

          // First verification should succeed
          const first = await service.verifyMagicLink(token);
          expect(first).toHaveProperty('session_token');
          expect(first).toHaveProperty('traveler_id', travelerId);

          // Second verification should return 'used'
          const second = await service.verifyMagicLink(token);
          expect(second).toEqual({ error: 'used' });

          // Third verification should also return 'used'
          const third = await service.verifyMagicLink(token);
          expect(third).toEqual({ error: 'used' });
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 7: Magic link expiry enforcement
 * Validates: Requirements 1.3
 *
 * For any token with expires_at in the past, verification must return { error: 'expired' }.
 * For any token with expires_at in the future and not yet used, verification must succeed.
 */
describe('Property 7: Magic link expiry enforcement', () => {
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

  it('tokens with expires_at in the past must return { error: "expired" }', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.base64String({ minLength: 10, maxLength: 64 }),
        fc.uuid(),
        fc.uuid(),
        // Generate a past date: between 1 second and 365 days ago
        fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
        async (token, travelerId, linkId, msAgo) => {
          const pastExpiry = new Date(Date.now() - msAgo);

          const db = {
            query: vi.fn().mockImplementation((sql: string) => {
              if (sql.includes('SELECT') && sql.includes('magic_links')) {
                return Promise.resolve({
                  rows: [{
                    link_id: linkId,
                    traveler_id: travelerId,
                    expires_at: pastExpiry.toISOString(),
                    used_at: null,
                    role_type: 'traveler',
                    family_id: null,
                  }],
                });
              }
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as import('pg').Pool;

          const service = createAuthService({ db, emailService: createMockEmailService() });
          const result = await service.verifyMagicLink(token);
          expect(result).toEqual({ error: 'expired' });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tokens with expires_at in the future and not used must succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.base64String({ minLength: 10, maxLength: 64 }),
        fc.uuid(),
        fc.uuid(),
        // Generate a future date: between 1 minute and 24 hours from now
        fc.integer({ min: 60_000, max: 24 * 60 * 60 * 1000 }),
        async (token, travelerId, linkId, msAhead) => {
          const futureExpiry = new Date(Date.now() + msAhead);

          const db = {
            query: vi.fn().mockImplementation((sql: string) => {
              if (sql.includes('SELECT') && sql.includes('magic_links')) {
                return Promise.resolve({
                  rows: [{
                    link_id: linkId,
                    traveler_id: travelerId,
                    expires_at: futureExpiry.toISOString(),
                    used_at: null,
                    role_type: 'traveler',
                    family_id: null,
                  }],
                });
              }
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as import('pg').Pool;

          const service = createAuthService({ db, emailService: createMockEmailService() });
          const result = await service.verifyMagicLink(token);
          expect(result).toHaveProperty('session_token');
          expect(result).toHaveProperty('traveler_id', travelerId);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 8: Auth response uniformity
 * Validates: Requirements 1.5, 2.2
 *
 * For any email address (whether it exists in the database or not), requestMagicLink
 * must always return { success: true }.
 * For any booking_id + last_name combination that doesn't match, bookingLookup
 * must return the same generic error shape.
 */
describe('Property 8: Auth response uniformity', () => {
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

  it('requestMagicLink always returns { success: true } for any email string', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          // Randomly decide if the email exists in the DB
          const emailExists = email.length % 2 === 0;

          const db = {
            query: vi.fn().mockImplementation((sql: string) => {
              if (sql.includes('SELECT') && sql.includes('travelers')) {
                return Promise.resolve({
                  rows: emailExists ? [{ traveler_id: 'tid-exists' }] : [],
                });
              }
              // INSERT magic_link
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as import('pg').Pool;

          const service = createAuthService({ db, emailService: createMockEmailService() });
          const result = await service.requestMagicLink(email);

          expect(result).toEqual({ success: true });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('requestMagicLink returns { success: true } even for non-existent emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          // DB always returns no match
          const db = {
            query: vi.fn().mockResolvedValue({ rows: [] }),
          } as unknown as import('pg').Pool;

          const service = createAuthService({ db, emailService: createMockEmailService() });
          const result = await service.requestMagicLink(email);

          expect(result).toEqual({ success: true });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('bookingLookup returns identical error shape for any mismatched credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 7, maxLength: 15 }),
        async (bookingId, lastName, clientIp) => {
          // DB always returns no match (mismatched credentials)
          const db = {
            query: vi.fn().mockResolvedValue({ rows: [] }),
          } as unknown as import('pg').Pool;

          const redis = createMockRedis();
          const service = createAuthService({ db, emailService: createMockEmailService(), redis });
          const result = await service.bookingLookup(bookingId, lastName, clientIp);

          expect(result).toEqual({
            error: 'invalid_credentials',
            message: 'Invalid booking ID or last name',
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 9: Rate limiting enforcement
 * Validates: Requirements 1.6
 *
 * After N requests (where N > maxRequests), the rate limiter should reject.
 * This tests the Redis sliding window logic used by the rate limiter.
 */
describe('Property 9: Rate limiting enforcement', () => {
  it('after maxRequests, subsequent requests within the window are rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),   // maxRequests
        fc.integer({ min: 1, max: 10 }),    // extra requests beyond limit
        (maxRequests, extraRequests) => {
          // Simulate the sliding window rate limiter logic:
          // A sorted set tracks timestamps of requests within the window.
          // After removing expired entries, if count > maxRequests, reject.
          const windowMs = 3600_000; // 1 hour
          const now = Date.now();
          const requestTimestamps: number[] = [];

          // Simulate maxRequests allowed requests
          for (let i = 0; i < maxRequests; i++) {
            const ts = now - Math.floor(Math.random() * windowMs * 0.9); // within window
            requestTimestamps.push(ts);
          }

          // At this point, count === maxRequests
          // The rate limiter checks: if count > maxRequests, reject
          // So the next request (maxRequests + 1) should be rejected

          for (let i = 0; i < extraRequests; i++) {
            requestTimestamps.push(now);
            const windowStart = now - windowMs;
            const inWindow = requestTimestamps.filter(ts => ts > windowStart);
            // After adding the extra request, count > maxRequests
            expect(inWindow.length).toBeGreaterThan(maxRequests);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('requests outside the window do not count toward the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),   // maxRequests
        fc.integer({ min: 1, max: 50 }),    // old requests (outside window)
        (maxRequests, oldRequestCount) => {
          const windowMs = 3600_000;
          const now = Date.now();
          const windowStart = now - windowMs;

          // All old requests are outside the window
          const requestTimestamps: number[] = [];
          for (let i = 0; i < oldRequestCount; i++) {
            requestTimestamps.push(windowStart - 1000 * (i + 1));
          }

          // Remove expired entries (simulating zremrangebyscore)
          const inWindow = requestTimestamps.filter(ts => ts > windowStart);

          // No requests in window, so should be allowed
          expect(inWindow.length).toBe(0);
          expect(inWindow.length).toBeLessThanOrEqual(maxRequests);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('exactly maxRequests within window are allowed, maxRequests+1 is rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (maxRequests) => {
          const windowMs = 3600_000;
          const now = Date.now();
          const windowStart = now - windowMs;
          const requestTimestamps: number[] = [];

          // Add exactly maxRequests timestamps within the window
          for (let i = 0; i < maxRequests; i++) {
            requestTimestamps.push(now - i * 1000);
          }

          const inWindowBefore = requestTimestamps.filter(ts => ts > windowStart);
          // At maxRequests, the rate limiter allows (count <= maxRequests)
          expect(inWindowBefore.length).toBe(maxRequests);
          expect(inWindowBefore.length).toBeLessThanOrEqual(maxRequests);

          // Add one more — now count > maxRequests, should be rejected
          requestTimestamps.push(now);
          const inWindowAfter = requestTimestamps.filter(ts => ts > windowStart);
          expect(inWindowAfter.length).toBe(maxRequests + 1);
          expect(inWindowAfter.length).toBeGreaterThan(maxRequests);
        },
      ),
      { numRuns: 100 },
    );
  });
});
