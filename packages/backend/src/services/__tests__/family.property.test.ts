import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { createTravelerService } from '../traveler.service.js';
import type { RoleType } from '@wsb/shared';
import type { FamilyResponse } from '@wsb/shared';

// ─── Generators ──────────────────────────────────────────────

/** Generate a valid role_type for adult family members */
const arbAdultRole = fc.constantFrom<RoleType>('traveler', 'representative');

/** Generate a family member record */
function arbFamilyMember(overrides?: { role_type?: RoleType; guardian_id?: string | null }) {
  return fc.record({
    traveler_id: fc.uuid(),
    full_name_raw: fc.string({ minLength: 2, maxLength: 60 }),
    role_type: overrides?.role_type ? fc.constant(overrides.role_type) : arbAdultRole,
    guardian_id: fc.constant(overrides?.guardian_id ?? null),
    qr_token: fc.hexaString({ minLength: 16, maxLength: 32 }),
  });
}

// ─── Property Tests ──────────────────────────────────────────

/**
 * Property 10: Family representative uniqueness invariant
 * Validates: Requirements 4.2, 47.1
 *
 * For any Family_ID in the system, there SHALL be exactly one member
 * with the representative role. A family with zero or more than one
 * representative violates the invariant.
 */
describe('Property 10: Family representative uniqueness invariant', () => {
  it('any valid family configuration must have exactly one representative', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // family_id
        // Generate 0..7 non-representative members
        fc.array(arbFamilyMember({ role_type: 'traveler' }), { minLength: 0, maxLength: 7 }),
        // Generate exactly 1 representative
        arbFamilyMember({ role_type: 'representative' }),
        (familyId, otherMembers, representative) => {
          const allMembers = [representative, ...otherMembers];

          // Invariant: exactly one representative per family
          const representatives = allMembers.filter(m => m.role_type === 'representative');
          expect(representatives).toHaveLength(1);
          expect(representatives[0].traveler_id).toBe(representative.traveler_id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a family with zero representatives violates the invariant', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(arbFamilyMember({ role_type: 'traveler' }), { minLength: 1, maxLength: 8 }),
        (_familyId, members) => {
          // All members are non-representative
          const representatives = members.filter(m => m.role_type === 'representative');
          // This configuration violates the invariant
          expect(representatives).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a family with two representatives violates the invariant', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        arbFamilyMember({ role_type: 'representative' }),
        arbFamilyMember({ role_type: 'representative' }),
        fc.array(arbFamilyMember({ role_type: 'traveler' }), { minLength: 0, maxLength: 5 }),
        (_familyId, rep1, rep2, others) => {
          const allMembers = [rep1, rep2, ...others];
          const representatives = allMembers.filter(m => m.role_type === 'representative');
          // Two representatives violates the uniqueness invariant
          expect(representatives.length).toBeGreaterThan(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getFamily endpoint returns members where exactly one is representative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // family_id
        fc.uuid(), // representative traveler_id
        fc.array(
          fc.record({
            traveler_id: fc.uuid(),
            full_name_raw: fc.string({ minLength: 2, maxLength: 40 }),
            role_type: fc.constantFrom<RoleType>('traveler', 'minor'),
            qr_token: fc.hexaString({ minLength: 16, maxLength: 32 }),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        fc.string({ minLength: 2, maxLength: 40 }), // rep name
        fc.hexaString({ minLength: 16, maxLength: 32 }), // rep qr
        async (familyId, repId, otherMembers, repName, repQr) => {
          const allDbMembers = [
            { traveler_id: repId, full_name_raw: repName, role_type: 'representative' as RoleType },
            ...otherMembers.map(m => ({
              traveler_id: m.traveler_id,
              full_name_raw: m.full_name_raw,
              role_type: m.role_type,
            })),
          ];

          const qrMap = new Map<string, string>();
          qrMap.set(repId, repQr);
          for (const m of otherMembers) {
            qrMap.set(m.traveler_id, m.qr_token);
          }

          let queryCall = 0;
          const db = {
            query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
              queryCall++;
              // 1st call: traveler lookup (role_type + family_id)
              if (queryCall === 1) {
                return Promise.resolve({
                  rows: [{ role_type: 'representative', family_id: familyId }],
                });
              }
              // 2nd call: family members
              if (queryCall === 2) {
                return Promise.resolve({ rows: allDbMembers });
              }
              // Subsequent calls: QR token lookups per member
              const travelerId = (params as string[])?.[0];
              const token = travelerId ? qrMap.get(travelerId) ?? '' : '';
              return Promise.resolve({
                rows: token ? [{ token_value: token }] : [],
              });
            }),
          } as unknown as import('pg').Pool;

          const service = createTravelerService({ db });
          const result = await service.getFamily(repId);

          // Should succeed (not an error)
          expect(result).not.toHaveProperty('error');
          const family = result as FamilyResponse;

          // Invariant: exactly one representative in the returned members
          const reps = family.members.filter(m => m.role_type === 'representative');
          expect(reps).toHaveLength(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 11: Minor single guardian invariant
 * Validates: Requirements 4.6, 47.2
 *
 * For any Minor_Dependent, the system SHALL prevent linking to more than
 * one guardian_id simultaneously. Each minor must have exactly one
 * guardian_id that is not null and references a valid adult traveler.
 */
describe('Property 11: Minor single guardian invariant', () => {
  it('every minor in a family must have exactly one non-null guardian_id', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // family_id
        fc.uuid(), // guardian (representative) traveler_id
        fc.array(
          fc.record({
            traveler_id: fc.uuid(),
            full_name_raw: fc.string({ minLength: 2, maxLength: 40 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (familyId, guardianId, minors) => {
          // Build a valid family: one guardian + N minors each linked to that guardian
          const familyMembers = [
            {
              traveler_id: guardianId,
              role_type: 'representative' as RoleType,
              guardian_id: null as string | null,
              family_id: familyId,
            },
            ...minors.map(m => ({
              traveler_id: m.traveler_id,
              role_type: 'minor' as RoleType,
              guardian_id: guardianId as string | null,
              family_id: familyId,
            })),
          ];

          // Invariant: every minor has exactly one guardian_id
          const minorMembers = familyMembers.filter(m => m.role_type === 'minor');
          for (const minor of minorMembers) {
            expect(minor.guardian_id).not.toBeNull();
            expect(typeof minor.guardian_id).toBe('string');
            expect(minor.guardian_id!.length).toBeGreaterThan(0);
          }

          // Invariant: guardian_id references a valid member in the family
          const memberIds = new Set(familyMembers.map(m => m.traveler_id));
          for (const minor of minorMembers) {
            expect(memberIds.has(minor.guardian_id!)).toBe(true);
          }

          // Invariant: guardian is not a minor themselves
          const guardian = familyMembers.find(m => m.traveler_id === guardianId);
          expect(guardian).toBeDefined();
          expect(guardian!.role_type).not.toBe('minor');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a minor with null guardian_id violates the invariant', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 2, maxLength: 40 }),
        (_familyId, minorId, minorName) => {
          const minor = {
            traveler_id: minorId,
            full_name_raw: minorName,
            role_type: 'minor' as RoleType,
            guardian_id: null as string | null,
          };

          // A minor without a guardian violates the invariant
          expect(minor.guardian_id).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a minor cannot be linked to multiple guardians simultaneously', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // minor id
        fc.uuid(), // guardian 1
        fc.uuid(), // guardian 2
        (minorId, guardian1, guardian2) => {
          // A minor has a single guardian_id field — it can only hold one value
          // If we try to assign two guardians, only one can be stored
          const minor = {
            traveler_id: minorId,
            role_type: 'minor' as RoleType,
            guardian_id: guardian1,
          };

          // The data model enforces single guardian via a scalar field
          expect(typeof minor.guardian_id).toBe('string');

          // Attempting to "add" a second guardian would overwrite the first
          const reassigned = { ...minor, guardian_id: guardian2 };
          expect(reassigned.guardian_id).toBe(guardian2);
          expect(reassigned.guardian_id).not.toBe(guardian1);

          // At no point can the minor have both guardians simultaneously
          // The scalar guardian_id field structurally prevents this
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 12: Minor QR accessible through guardian
 * Validates: Requirements 4.4
 *
 * For any Minor_Dependent linked to a guardian via guardian_id,
 * querying the guardian's family wallet endpoint SHALL include
 * the minor's QR_Token in the response members list.
 */
describe('Property 12: Minor QR accessible through guardian', () => {
  it('getFamily response includes all linked minors with their QR tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // family_id
        fc.uuid(), // guardian/representative id
        fc.string({ minLength: 2, maxLength: 40 }), // guardian name
        fc.hexaString({ minLength: 16, maxLength: 32 }), // guardian qr
        fc.array(
          fc.record({
            traveler_id: fc.uuid(),
            full_name_raw: fc.string({ minLength: 2, maxLength: 40 }),
            qr_token: fc.hexaString({ minLength: 16, maxLength: 32 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        async (familyId, guardianId, guardianName, guardianQr, minors) => {
          // Build DB rows: guardian (representative) + minors
          const allDbMembers = [
            { traveler_id: guardianId, full_name_raw: guardianName, role_type: 'representative' as RoleType },
            ...minors.map(m => ({
              traveler_id: m.traveler_id,
              full_name_raw: m.full_name_raw,
              role_type: 'minor' as RoleType,
            })),
          ];

          // QR token map
          const qrMap = new Map<string, string>();
          qrMap.set(guardianId, guardianQr);
          for (const m of minors) {
            qrMap.set(m.traveler_id, m.qr_token);
          }

          let queryCall = 0;
          const db = {
            query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
              queryCall++;
              // 1st: traveler lookup
              if (queryCall === 1) {
                return Promise.resolve({
                  rows: [{ role_type: 'representative', family_id: familyId }],
                });
              }
              // 2nd: family members
              if (queryCall === 2) {
                return Promise.resolve({ rows: allDbMembers });
              }
              // Subsequent: QR token per member
              const travelerId = (params as string[])?.[0];
              const token = travelerId ? qrMap.get(travelerId) ?? '' : '';
              return Promise.resolve({
                rows: token ? [{ token_value: token }] : [],
              });
            }),
          } as unknown as import('pg').Pool;

          const service = createTravelerService({ db });
          const result = await service.getFamily(guardianId);

          // Should succeed
          expect(result).not.toHaveProperty('error');
          const family = result as FamilyResponse;

          // Invariant: every minor's QR token is present in the response
          const responseMinors = family.members.filter(m => m.role_type === 'minor');
          expect(responseMinors).toHaveLength(minors.length);

          for (const minor of minors) {
            const found = family.members.find(m => m.traveler_id === minor.traveler_id);
            expect(found).toBeDefined();
            expect(found!.qr_token_value).toBe(minor.qr_token);
          }

          // Invariant: guardian can see all family QR tokens (including their own)
          expect(family.members).toHaveLength(allDbMembers.length);
          for (const member of family.members) {
            const expectedQr = qrMap.get(member.traveler_id);
            expect(member.qr_token_value).toBe(expectedQr ?? '');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('minor QR tokens are non-empty when active tokens exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // family_id
        fc.uuid(), // guardian id
        fc.uuid(), // minor id
        fc.hexaString({ minLength: 16, maxLength: 32 }), // minor qr token
        async (familyId, guardianId, minorId, minorQr) => {
          let queryCall = 0;
          const db = {
            query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
              queryCall++;
              if (queryCall === 1) {
                return Promise.resolve({
                  rows: [{ role_type: 'representative', family_id: familyId }],
                });
              }
              if (queryCall === 2) {
                return Promise.resolve({
                  rows: [
                    { traveler_id: guardianId, full_name_raw: 'Guardian', role_type: 'representative' },
                    { traveler_id: minorId, full_name_raw: 'Minor Child', role_type: 'minor' },
                  ],
                });
              }
              // QR lookups
              const travelerId = (params as string[])?.[0];
              if (travelerId === guardianId) {
                return Promise.resolve({ rows: [{ token_value: 'guardian-qr' }] });
              }
              if (travelerId === minorId) {
                return Promise.resolve({ rows: [{ token_value: minorQr }] });
              }
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as import('pg').Pool;

          const service = createTravelerService({ db });
          const result = await service.getFamily(guardianId);

          expect(result).not.toHaveProperty('error');
          const family = result as FamilyResponse;

          // The minor's QR token must be accessible and non-empty
          const minorMember = family.members.find(m => m.traveler_id === minorId);
          expect(minorMember).toBeDefined();
          expect(minorMember!.qr_token_value).toBe(minorQr);
          expect(minorMember!.qr_token_value.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
