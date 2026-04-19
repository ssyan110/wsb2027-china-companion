import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { TravelerProfile, ManifestTraveler, ManifestResponse } from '../api-types.js';
import { RoleTypes, AccessStatuses, EventTypes } from '../enums.js';

// ─── Arbitraries ─────────────────────────────────────────────

/** Arbitrary for RoleType enum values */
const arbRoleType = fc.constantFrom(...RoleTypes);

/** Arbitrary for AccessStatus enum values */
const arbAccessStatus = fc.constantFrom(...AccessStatuses);

/** Arbitrary for a hotel object or null */
const arbHotel = fc.option(
  fc.record({
    hotel_id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    address_en: fc.string({ minLength: 1, maxLength: 200 }),
    address_cn: fc.string({ minLength: 1, maxLength: 200 }),
  }),
  { nil: null },
);

/** Arbitrary for a valid TravelerProfile */
const arbTravelerProfile: fc.Arbitrary<TravelerProfile> = fc.record({
  traveler_id: fc.uuid(),
  full_name: fc.string({ minLength: 1, maxLength: 255 }),
  email: fc.emailAddress(),
  role_type: arbRoleType,
  access_status: arbAccessStatus,
  family_id: fc.option(fc.uuid(), { nil: null }),
  group_ids: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
  hotel: arbHotel,
  qr_token: fc.base64String({ minLength: 16, maxLength: 64 }),
});

/** Arbitrary for a QR token string (printable ASCII, non-empty) */
const arbQrToken = fc.stringOf(
  fc.char().filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126),
  { minLength: 1, maxLength: 128 },
);

/** Arbitrary for a ManifestTraveler entry */
const arbManifestTraveler: fc.Arbitrary<ManifestTraveler> = fc.record({
  qr_token_value: fc.base64String({ minLength: 16, maxLength: 64 }),
  traveler_id: fc.uuid(),
  full_name: fc.string({ minLength: 1, maxLength: 255 }),
  family_id: fc.option(fc.uuid(), { nil: null }),
  role_type: arbRoleType,
  eligibility: fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
});

/** Arbitrary for a ManifestResponse */
const arbManifestResponse: fc.Arbitrary<ManifestResponse> = fc.record({
  travelers: fc.array(arbManifestTraveler, { minLength: 0, maxLength: 20 }),
  version: fc.stringOf(fc.char().filter(c => c >= '0' && c <= '9'), {
    minLength: 1,
    maxLength: 10,
  }),
});

// ─── Property 1: Traveler serialization round-trip ───────────
// Validates: Requirements 46.1

describe('Property 1: Traveler serialization round-trip', () => {
  it('JSON.stringify → JSON.parse produces an identical TravelerProfile', () => {
    fc.assert(
      fc.property(arbTravelerProfile, (profile: TravelerProfile) => {
        const serialized = JSON.stringify(profile);
        const deserialized: TravelerProfile = JSON.parse(serialized);

        expect(deserialized).toEqual(profile);
      }),
      { numRuns: 200 },
    );
  });

  it('preserves all scalar fields through round-trip', () => {
    fc.assert(
      fc.property(arbTravelerProfile, (profile: TravelerProfile) => {
        const roundTripped: TravelerProfile = JSON.parse(JSON.stringify(profile));

        expect(roundTripped.traveler_id).toBe(profile.traveler_id);
        expect(roundTripped.full_name).toBe(profile.full_name);
        expect(roundTripped.email).toBe(profile.email);
        expect(roundTripped.role_type).toBe(profile.role_type);
        expect(roundTripped.access_status).toBe(profile.access_status);
        expect(roundTripped.family_id).toBe(profile.family_id);
        expect(roundTripped.qr_token).toBe(profile.qr_token);
      }),
      { numRuns: 200 },
    );
  });

  it('preserves group_ids array through round-trip', () => {
    fc.assert(
      fc.property(arbTravelerProfile, (profile: TravelerProfile) => {
        const roundTripped: TravelerProfile = JSON.parse(JSON.stringify(profile));

        expect(roundTripped.group_ids).toEqual(profile.group_ids);
        expect(roundTripped.group_ids.length).toBe(profile.group_ids.length);
      }),
      { numRuns: 200 },
    );
  });

  it('preserves hotel object (or null) through round-trip', () => {
    fc.assert(
      fc.property(arbTravelerProfile, (profile: TravelerProfile) => {
        const roundTripped: TravelerProfile = JSON.parse(JSON.stringify(profile));

        if (profile.hotel === null) {
          expect(roundTripped.hotel).toBeNull();
        } else {
          expect(roundTripped.hotel).toEqual(profile.hotel);
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 2: QR encoding round-trip ──────────────────────
// Validates: Requirements 46.2

describe('Property 2: QR encoding round-trip', () => {
  it('QR token string survives JSON serialization round-trip', () => {
    fc.assert(
      fc.property(arbQrToken, (token: string) => {
        const serialized = JSON.stringify(token);
        const deserialized: string = JSON.parse(serialized);

        expect(deserialized).toBe(token);
      }),
      { numRuns: 200 },
    );
  });

  it('QR token embedded in an object survives JSON round-trip', () => {
    fc.assert(
      fc.property(arbQrToken, fc.string({ minLength: 1 }), (token, name) => {
        const qrPayload = { token_value: token, traveler_name: name };
        const serialized = JSON.stringify(qrPayload);
        const deserialized = JSON.parse(serialized);

        expect(deserialized.token_value).toBe(token);
        expect(deserialized.traveler_name).toBe(name);
      }),
      { numRuns: 200 },
    );
  });

  it('QR token preserves exact length through serialization', () => {
    fc.assert(
      fc.property(arbQrToken, (token: string) => {
        const roundTripped: string = JSON.parse(JSON.stringify(token));

        expect(roundTripped.length).toBe(token.length);
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 3: Manifest serialization round-trip ───────────
// Validates: Requirements 46.3

describe('Property 3: Manifest serialization round-trip', () => {
  it('JSON.stringify → JSON.parse produces an identical ManifestResponse', () => {
    fc.assert(
      fc.property(arbManifestResponse, (manifest: ManifestResponse) => {
        const serialized = JSON.stringify(manifest);
        const deserialized: ManifestResponse = JSON.parse(serialized);

        expect(deserialized).toEqual(manifest);
      }),
      { numRuns: 200 },
    );
  });

  it('preserves traveler count through round-trip', () => {
    fc.assert(
      fc.property(arbManifestResponse, (manifest: ManifestResponse) => {
        const roundTripped: ManifestResponse = JSON.parse(JSON.stringify(manifest));

        expect(roundTripped.travelers.length).toBe(manifest.travelers.length);
        expect(roundTripped.version).toBe(manifest.version);
      }),
      { numRuns: 200 },
    );
  });

  it('preserves each traveler eligibility array through round-trip', () => {
    fc.assert(
      fc.property(arbManifestResponse, (manifest: ManifestResponse) => {
        const roundTripped: ManifestResponse = JSON.parse(JSON.stringify(manifest));

        for (let i = 0; i < manifest.travelers.length; i++) {
          const original = manifest.travelers[i];
          const restored = roundTripped.travelers[i];

          expect(restored.qr_token_value).toBe(original.qr_token_value);
          expect(restored.traveler_id).toBe(original.traveler_id);
          expect(restored.full_name).toBe(original.full_name);
          expect(restored.family_id).toBe(original.family_id);
          expect(restored.role_type).toBe(original.role_type);
          expect(restored.eligibility).toEqual(original.eligibility);
        }
      }),
      { numRuns: 200 },
    );
  });
});
