import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidOverrideReason, OVERRIDE_REASONS } from '../scan-validator';

/**
 * Feature: wsb-2027-china-companion
 * Property 18: Override reason completeness invariant
 *
 * For any scan event with result "override", the override_reason field
 * SHALL be non-null, non-empty, and SHALL be one of the predefined reason codes.
 *
 * **Validates: Requirements 16.2, 16.3, 48.5**
 */

describe('Property 18: Override reason completeness invariant', () => {
  it('accepts all predefined override reason codes', () => {
    for (const reason of OVERRIDE_REASONS) {
      expect(isValidOverrideReason(reason)).toBe(true);
    }
  });

  it('rejects null, undefined, and empty strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, '', '   '),
        (reason) => {
          expect(isValidOverrideReason(reason as string | null | undefined)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects any string that is not one of the predefined reason codes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => !(OVERRIDE_REASONS as readonly string[]).includes(s),
        ),
        (randomReason) => {
          expect(isValidOverrideReason(randomReason)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('predefined reasons list contains exactly 4 codes', () => {
    expect(OVERRIDE_REASONS).toEqual([
      'Manager Approved',
      'Data Error',
      'VIP Exception',
      'Emergency',
    ]);
    expect(OVERRIDE_REASONS.length).toBe(4);
  });

  it('every valid override reason is non-null, non-empty, and in the predefined list', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...OVERRIDE_REASONS),
        (reason) => {
          expect(reason).not.toBeNull();
          expect(reason).not.toBe('');
          expect(reason.trim().length).toBeGreaterThan(0);
          expect(isValidOverrideReason(reason)).toBe(true);
          expect((OVERRIDE_REASONS as readonly string[]).includes(reason)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
