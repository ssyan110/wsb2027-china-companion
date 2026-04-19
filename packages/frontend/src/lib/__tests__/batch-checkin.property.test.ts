import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { batchFamilyCheckIn } from '../scan-validator';
import type { ManifestEntry } from '@wsb/shared';

/**
 * Feature: wsb-2027-china-companion
 * Property 17: Batch family check-in correctness
 *
 * For any Family_Representative's QR token scanned in batch mode,
 * and for any active scan mode, the batch result SHALL list all linked
 * family members. Each member SHALL be marked eligible if and only if
 * their individual eligibility array contains the active scan mode.
 * The check-in count SHALL equal the number of eligible members.
 *
 * **Validates: Requirements 15.1, 15.2, 15.3, 15.4**
 */

// ─── Generators ──────────────────────────────────────────────

const arbRoleType = fc.constantFrom('traveler', 'minor', 'representative') as fc.Arbitrary<'traveler' | 'minor' | 'representative'>;

function arbFamilyGroup(scanMode: string) {
  return fc.record({
    familyId: fc.uuid(),
    repToken: fc.hexaString({ minLength: 8, maxLength: 32 }),
    memberCount: fc.integer({ min: 1, max: 6 }),
  }).chain(({ familyId, repToken, memberCount }) => {
    const members: fc.Arbitrary<ManifestEntry>[] = [];

    // Representative
    members.push(
      fc.record({
        qr_token_value: fc.constant(repToken),
        traveler_id: fc.uuid(),
        full_name: fc.string({ minLength: 2, maxLength: 30 }),
        family_id: fc.constant(familyId) as fc.Arbitrary<string | null>,
        role_type: fc.constant('representative') as fc.Arbitrary<'traveler' | 'minor' | 'representative'>,
        eligibility: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 0, maxLength: 4 }),
      }),
    );

    // Additional members
    for (let i = 1; i < memberCount; i++) {
      members.push(
        fc.record({
          qr_token_value: fc.hexaString({ minLength: 8, maxLength: 32 }),
          traveler_id: fc.uuid(),
          full_name: fc.string({ minLength: 2, maxLength: 30 }),
          family_id: fc.constant(familyId) as fc.Arbitrary<string | null>,
          role_type: arbRoleType,
          eligibility: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 0, maxLength: 4 }),
        }),
      );
    }

    return fc.record({
      familyId: fc.constant(familyId),
      repToken: fc.constant(repToken),
      members: fc.tuple(...members),
    });
  });
}

function buildManifest(entries: ManifestEntry[]): Map<string, ManifestEntry> {
  const map = new Map<string, ManifestEntry>();
  for (const e of entries) map.set(e.qr_token_value, e);
  return map;
}

// ─── Property Tests ──────────────────────────────────────────

describe('Property 17: Batch family check-in correctness', () => {
  it('lists all family members and correctly marks eligibility', () => {
    const scanMode = 'test-mode-abc';

    fc.assert(
      fc.property(
        arbFamilyGroup(scanMode),
        ({ familyId, repToken, members }) => {
          const allMembers = [...members];
          const manifest = buildManifest(allMembers);

          const result = batchFamilyCheckIn(repToken, scanMode, manifest);

          // Must return a result since rep has a family_id
          expect(result).not.toBeNull();
          if (!result) return;

          // All family members should be listed
          expect(result.familyId).toBe(familyId);
          expect(result.totalCount).toBe(allMembers.length);
          expect(result.members.length).toBe(allMembers.length);

          // Each member's eligibility should match their individual eligibility array
          for (const m of result.members) {
            const expected = m.traveler.eligibility.includes(scanMode);
            expect(m.eligible).toBe(expected);
          }

          // Eligible count should match
          const expectedEligible = allMembers.filter((e) => e.eligibility.includes(scanMode)).length;
          expect(result.eligibleCount).toBe(expectedEligible);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null when QR token has no family_id', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 8, maxLength: 32 }),
        fc.uuid(),
        fc.string({ minLength: 3, maxLength: 15 }),
        (token, travelerId, scanMode) => {
          const entry: ManifestEntry = {
            qr_token_value: token,
            traveler_id: travelerId,
            full_name: 'Solo Traveler',
            family_id: null,
            role_type: 'traveler',
            eligibility: [scanMode],
          };
          const manifest = buildManifest([entry]);

          const result = batchFamilyCheckIn(token, scanMode, manifest);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null when QR token is not in manifest', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 8, maxLength: 32 }),
        fc.string({ minLength: 3, maxLength: 15 }),
        (unknownToken, scanMode) => {
          const manifest = new Map<string, ManifestEntry>();
          const result = batchFamilyCheckIn(unknownToken, scanMode, manifest);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
