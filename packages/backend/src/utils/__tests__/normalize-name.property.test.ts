import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { normalizeName } from '../normalize-name.js';

/**
 * Property 5: Name normalization idempotence
 * Validates: Requirements 2.3, 47.6
 *
 * For any string input, applying the normalization function twice
 * SHALL produce the same result as applying it once:
 * normalize(normalize(s)) === normalize(s)
 */
describe('Property 5: Name normalization idempotence', () => {
  it('normalizeName is idempotent: normalizeName(normalizeName(x)) === normalizeName(x) for all strings', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const once = normalizeName(input);
        const twice = normalizeName(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 1000 }
    );
  });

  it('output never contains leading or trailing whitespace', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = normalizeName(input);
        if (result.length > 0) {
          expect(result).toBe(result.trim());
        }
      }),
      { numRuns: 1000 }
    );
  });

  it('output never contains consecutive whitespace characters', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = normalizeName(input);
        expect(result).not.toMatch(/\s{2,}/);
      }),
      { numRuns: 1000 }
    );
  });

  it('output is always lowercase', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = normalizeName(input);
        expect(result).toBe(result.toLowerCase());
      }),
      { numRuns: 1000 }
    );
  });
});
