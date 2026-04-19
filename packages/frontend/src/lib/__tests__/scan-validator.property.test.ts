import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateScan } from '../scan-validator';
import type { ManifestEntry } from '@wsb/shared';

/**
 * Feature: wsb-2027-china-companion
 * Property 16: Local scan validation correctness
 *
 * For any QR token string and for any manifest and active scan mode:
 * - If the token exists in the manifest AND the traveler's eligibility array
 *   contains the active scan mode, validation SHALL return "pass".
 * - If the token exists but eligibility does not include the scan mode,
 *   validation SHALL return "wrong_assignment".
 * - If the token does not exist in the manifest, validation SHALL return "fail".
 *
 * **Validates: Requirements 12.2, 13.1, 14.1, 48.4**
 */

// ─── Generators ──────────────────────────────────────────────

const arbRoleType = fc.constantFrom('traveler', 'minor', 'representative') as fc.Arbitrary<'traveler' | 'minor' | 'representative'>;

const arbManifestEntry = fc.record({
  qr_token_value: fc.hexaString({ minLength: 8, maxLength: 32 }),
  traveler_id: fc.uuid(),
  full_name: fc.string({ minLength: 2, maxLength: 50 }),
  family_id: fc.option(fc.uuid(), { nil: null }),
  role_type: arbRoleType,
  eligibility: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
});

function buildManifest(entries: ManifestEntry[]): Map<string, ManifestEntry> {
  const map = new Map<string, ManifestEntry>();
  for (const e of entries) map.set(e.qr_token_value, e);
  return map;
}

// ─── Property Tests ──────────────────────────────────────────

describe('Property 16: Local scan validation correctness', () => {
  it('returns "pass" when token exists and eligibility includes the active scan mode', () => {
    fc.assert(
      fc.property(
        arbManifestEntry,
        fc.string({ minLength: 3, maxLength: 20 }),
        (entry, scanMode) => {
          // Ensure the entry is eligible for this mode
          const eligible = { ...entry, eligibility: [...entry.eligibility, scanMode] };
          const manifest = buildManifest([eligible]);

          const result = validateScan(eligible.qr_token_value, scanMode, manifest);
          expect(result.result).toBe('pass');
          if (result.result === 'pass') {
            expect(result.traveler.traveler_id).toBe(eligible.traveler_id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "wrong_assignment" when token exists but eligibility does not include the scan mode', () => {
    fc.assert(
      fc.property(
        arbManifestEntry,
        fc.string({ minLength: 3, maxLength: 20 }),
        (entry, scanMode) => {
          // Ensure the entry is NOT eligible for this mode
          const ineligible = {
            ...entry,
            eligibility: entry.eligibility.filter((e) => e !== scanMode),
          };
          const manifest = buildManifest([ineligible]);

          const result = validateScan(ineligible.qr_token_value, scanMode, manifest);
          expect(result.result).toBe('wrong_assignment');
          if (result.result === 'wrong_assignment') {
            expect(result.traveler.traveler_id).toBe(ineligible.traveler_id);
            expect(result.reason).toBe('not_eligible_for_mode');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "fail" when token does not exist in the manifest', () => {
    fc.assert(
      fc.property(
        fc.array(arbManifestEntry, { minLength: 0, maxLength: 10 }),
        fc.hexaString({ minLength: 8, maxLength: 32 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        (entries, unknownToken, scanMode) => {
          const manifest = buildManifest(entries);
          // Ensure the token is not in the manifest
          if (manifest.has(unknownToken)) return; // skip this case

          const result = validateScan(unknownToken, scanMode, manifest);
          expect(result.result).toBe('fail');
          if (result.result === 'fail') {
            expect(result.reason).toBe('unknown_qr');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
