import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import crypto from 'node:crypto';

// ─── Local token state simulation ────────────────────────────

interface TokenRecord {
  token_value: string;
  token_hash: string;
  is_active: boolean;
  revoked_at: Date | null;
}

/**
 * Simulates QR token issuance: generates a random token value and
 * its SHA-256 hex hash, returning an active token record.
 */
function issueToken(): TokenRecord {
  const token_value = crypto.randomBytes(32).toString('base64url');
  const token_hash = crypto
    .createHash('sha256')
    .update(token_value)
    .digest('hex');
  return { token_value, token_hash, is_active: true, revoked_at: null };
}

/**
 * Simulates the reissuance process for a traveler:
 * 1. Invalidate the current active token (is_active=false, revoked_at set)
 * 2. Generate a new active token
 * Returns the new token record.
 */
function reissueToken(tokens: TokenRecord[]): TokenRecord {
  // Invalidate all currently active tokens for this traveler
  for (const t of tokens) {
    if (t.is_active) {
      t.is_active = false;
      t.revoked_at = new Date();
    }
  }
  // Issue a new active token
  const newToken = issueToken();
  tokens.push(newToken);
  return newToken;
}

// ─── Property Tests ──────────────────────────────────────────

/**
 * Property 13: Active QR token uniqueness after reissuance
 * Validates: Requirements 22.1, 22.2, 22.5, 47.3
 *
 * For any Traveler, after QR token reissuance, there SHALL be exactly
 * one active QR_Token for that traveler. The previously active token
 * SHALL have is_active = false and revoked_at set.
 */
describe('Property 13: Active QR token uniqueness after reissuance', () => {
  it('after reissuance, old token is invalidated and new token is active', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 20 }),
        (travelerId, reissueCount) => {
          // Start with an initial token for this traveler
          const tokens: TokenRecord[] = [issueToken()];

          for (let i = 0; i < reissueCount; i++) {
            const oldActiveToken = tokens.find(t => t.is_active);
            expect(oldActiveToken).toBeDefined();
            const oldTokenValue = oldActiveToken!.token_value;

            reissueToken(tokens);

            // The old token must now be invalidated
            const oldToken = tokens.find(t => t.token_value === oldTokenValue);
            expect(oldToken).toBeDefined();
            expect(oldToken!.is_active).toBe(false);
            expect(oldToken!.revoked_at).not.toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('at no point does a traveler have more than one active QR token', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 20 }),
        (travelerId, reissueCount) => {
          const tokens: TokenRecord[] = [issueToken()];

          // Check invariant after initial issuance
          const activeCount = tokens.filter(t => t.is_active).length;
          expect(activeCount).toBe(1);

          for (let i = 0; i < reissueCount; i++) {
            reissueToken(tokens);

            // Invariant: exactly one active token at all times
            const activeTokens = tokens.filter(t => t.is_active);
            expect(activeTokens).toHaveLength(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the new token value is different from the old token value', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 20 }),
        (travelerId, reissueCount) => {
          const tokens: TokenRecord[] = [issueToken()];

          for (let i = 0; i < reissueCount; i++) {
            const oldActiveToken = tokens.find(t => t.is_active)!;
            const oldValue = oldActiveToken.token_value;

            const newToken = reissueToken(tokens);

            // New token value must differ from the old one
            expect(newToken.token_value).not.toBe(oldValue);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the new token hash is a valid SHA-256 hex string (64 chars)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 20 }),
        (travelerId, reissueCount) => {
          const tokens: TokenRecord[] = [issueToken()];

          for (let i = 0; i < reissueCount; i++) {
            const newToken = reissueToken(tokens);

            // SHA-256 hex: exactly 64 lowercase hex characters
            expect(newToken.token_hash).toMatch(/^[a-f0-9]{64}$/);

            // Verify the hash actually corresponds to the token value
            const expectedHash = crypto
              .createHash('sha256')
              .update(newToken.token_value)
              .digest('hex');
            expect(newToken.token_hash).toBe(expectedHash);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all token values across multiple reissuances are unique', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 20 }),
        (travelerId, reissueCount) => {
          const tokens: TokenRecord[] = [issueToken()];

          for (let i = 0; i < reissueCount; i++) {
            reissueToken(tokens);
          }

          // All token values should be unique
          const values = tokens.map(t => t.token_value);
          const uniqueValues = new Set(values);
          expect(uniqueValues.size).toBe(values.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
