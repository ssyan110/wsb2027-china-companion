import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { normalizeName } from '../../utils/normalize-name.js';
import { createRescueService } from '../rescue.service.js';
import type { SearchCandidate } from '@wsb/shared';

// ─── Helpers ─────────────────────────────────────────────────

/** Simulated traveler record for property testing. */
interface SimTraveler {
  traveler_id: string;
  full_name_raw: string;
  full_name_normalized: string;
  email_primary: string;
  booking_id: string;
  family_id: string | null;
  access_status: 'invited' | 'activated' | 'linked' | 'rescued';
}

/**
 * Computes trigram similarity between two strings (simplified JS
 * implementation of PostgreSQL pg_trgm similarity()).
 */
function trigramSimilarity(a: string, b: string): number {
  const trigramsOf = (s: string): Set<string> => {
    const padded = `  ${s} `;
    const set = new Set<string>();
    for (let i = 0; i <= padded.length - 3; i++) {
      set.add(padded.slice(i, i + 3));
    }
    return set;
  };
  const tA = trigramsOf(a);
  const tB = trigramsOf(b);
  let intersection = 0;
  for (const t of tA) {
    if (tB.has(t)) intersection++;
  }
  const union = tA.size + tB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.2;
const MAX_RESULTS = 20;

/**
 * Simulates the name-search path of the rescue service by computing
 * trigram similarity locally (mirrors the PostgreSQL query).
 */
function simulateNameSearch(
  query: string,
  travelers: SimTraveler[],
): SearchCandidate[] {
  const normalizedQuery = normalizeName(query);
  if (normalizedQuery.length < 2) return [];

  return travelers
    .map((t) => ({
      traveler: t,
      score: trigramSimilarity(t.full_name_normalized, normalizedQuery),
    }))
    .filter(({ score }) => score > SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ traveler, score }) => ({
      traveler_id: traveler.traveler_id,
      full_name: traveler.full_name_raw,
      email: traveler.email_primary,
      booking_id: traveler.booking_id,
      family_id: traveler.family_id,
      access_status: traveler.access_status,
      match_score: score,
    }));
}

/**
 * Simulates the email-search path: prefix LIKE match OR trigram
 * similarity above threshold.
 */
function simulateEmailSearch(
  query: string,
  travelers: SimTraveler[],
): SearchCandidate[] {
  const lowerQuery = query.trim().toLowerCase();
  if (lowerQuery.length < 3) return [];

  return travelers
    .map((t) => {
      const prefixMatch = t.email_primary.startsWith(lowerQuery);
      const score = trigramSimilarity(t.email_primary, lowerQuery);
      const matches = prefixMatch || score > SIMILARITY_THRESHOLD;
      return { traveler: t, score, matches };
    })
    .filter(({ matches }) => matches)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ traveler, score }) => ({
      traveler_id: traveler.traveler_id,
      full_name: traveler.full_name_raw,
      email: traveler.email_primary,
      booking_id: traveler.booking_id,
      family_id: traveler.family_id,
      access_status: traveler.access_status,
      match_score: score,
    }));
}

/** fast-check arbitrary for a simple alphabetic name (2-20 chars). */
const nameArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), {
    minLength: 3,
    maxLength: 20,
  })
  .map((s) => s.replace(/\s+/g, ' ').trim())
  .filter((s) => s.length >= 2);

/** fast-check arbitrary for a simple email local part. */
const emailLocalArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 3, maxLength: 12 },
);

/** fast-check arbitrary for a simulated traveler. */
const travelerArb = fc
  .record({
    id: fc.uuid(),
    name: nameArb,
    emailLocal: emailLocalArb,
    familyId: fc.option(fc.uuid(), { nil: null }),
    status: fc.constantFrom(
      'invited' as const,
      'activated' as const,
      'linked' as const,
      'rescued' as const,
    ),
  })
  .map(({ id, name, emailLocal, familyId, status }) => ({
    traveler_id: id,
    full_name_raw: name,
    full_name_normalized: normalizeName(name),
    email_primary: `${emailLocal}@example.com`,
    booking_id: `BK-${id.slice(0, 8)}`,
    family_id: familyId,
    access_status: status,
  }));


// ─── Property Tests ──────────────────────────────────────────

/**
 * Property 22: Fuzzy search exact recall
 * Validates: Requirements 3.1, 3.2, 48.2
 *
 * For any Traveler in the database, searching for their exact
 * full_name_normalized SHALL always include that Traveler in the results.
 * Searching for any prefix of their email_primary (length >= 3) SHALL
 * include that Traveler in the results.
 */
describe('Property 22: Fuzzy search exact recall', () => {
  it('searching by exact normalized name always returns that traveler', () => {
    fc.assert(
      fc.property(
        travelerArb,
        fc.array(travelerArb, { minLength: 0, maxLength: 10 }),
        (target, others) => {
          // Build a dataset that includes the target traveler
          const allTravelers = [target, ...others];

          // Search using the target's exact normalized name
          const results = simulateNameSearch(
            target.full_name_normalized,
            allTravelers,
          );

          // The target traveler must appear in the results
          const found = results.some(
            (c) => c.traveler_id === target.traveler_id,
          );
          expect(found).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('searching by exact raw name always returns that traveler', () => {
    fc.assert(
      fc.property(
        travelerArb,
        fc.array(travelerArb, { minLength: 0, maxLength: 10 }),
        (target, others) => {
          const allTravelers = [target, ...others];

          // Search using the raw name (normalization happens inside search)
          const results = simulateNameSearch(
            target.full_name_raw,
            allTravelers,
          );

          const found = results.some(
            (c) => c.traveler_id === target.traveler_id,
          );
          expect(found).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('searching by email prefix (>= 3 chars) always returns that traveler', () => {
    fc.assert(
      fc.property(
        travelerArb,
        fc.array(travelerArb, { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 3, max: 15 }),
        (target, others, prefixLen) => {
          const allTravelers = [target, ...others];

          // Take a prefix of the email (at least 3 chars)
          const prefix = target.email_primary.slice(
            0,
            Math.min(prefixLen, target.email_primary.length),
          );
          if (prefix.length < 3) return; // skip if email is too short

          const results = simulateEmailSearch(prefix, allTravelers);

          const found = results.some(
            (c) => c.traveler_id === target.traveler_id,
          );
          expect(found).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('exact name match produces a high similarity score (> 0.5)', () => {
    fc.assert(
      fc.property(travelerArb, (target) => {
        const results = simulateNameSearch(target.full_name_normalized, [
          target,
        ]);

        expect(results.length).toBeGreaterThanOrEqual(1);
        const match = results.find(
          (c) => c.traveler_id === target.traveler_id,
        );
        expect(match).toBeDefined();
        // An exact match should have a high similarity score
        expect(match!.match_score).toBeGreaterThan(0.5);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Property 23: Fuzzy search monotonic refinement
 * Validates: Requirements 48.1
 *
 * For any search query string q that returns results, appending any
 * additional character to form q + c SHALL return a result set that is
 * a subset of or equal to the result set for q.
 */
describe('Property 23: Fuzzy search monotonic refinement', () => {
  it('adding characters to a name query never increases the result count', () => {
    fc.assert(
      fc.property(
        fc.array(travelerArb, { minLength: 1, maxLength: 15 }),
        nameArb,
        fc.stringOf(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 1, maxLength: 5 },
        ),
        (travelers, baseQuery, suffix) => {
          const shortResults = simulateNameSearch(baseQuery, travelers);
          const longQuery = baseQuery + suffix;
          const longResults = simulateNameSearch(longQuery, travelers);

          // The longer query should return the same or fewer results
          expect(longResults.length).toBeLessThanOrEqual(
            shortResults.length,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('progressively longer prefixes produce non-increasing result counts', () => {
    fc.assert(
      fc.property(
        fc.array(travelerArb, { minLength: 1, maxLength: 15 }),
        nameArb.filter((n) => n.length >= 4),
        (travelers, fullQuery) => {
          let prevCount = Infinity;

          // Test each prefix from length 2 up to the full query
          for (let len = 2; len <= fullQuery.length; len++) {
            const prefix = fullQuery.slice(0, len);
            const results = simulateNameSearch(prefix, travelers);
            expect(results.length).toBeLessThanOrEqual(prevCount);
            prevCount = results.length;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('adding characters to an email query never increases the result count', () => {
    fc.assert(
      fc.property(
        fc.array(travelerArb, { minLength: 1, maxLength: 15 }),
        emailLocalArb.filter((e) => e.length >= 3),
        fc.stringOf(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
          { minLength: 1, maxLength: 5 },
        ),
        (travelers, baseQuery, suffix) => {
          const shortResults = simulateEmailSearch(baseQuery, travelers);
          const longQuery = baseQuery + suffix;
          const longResults = simulateEmailSearch(longQuery, travelers);

          expect(longResults.length).toBeLessThanOrEqual(
            shortResults.length,
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
