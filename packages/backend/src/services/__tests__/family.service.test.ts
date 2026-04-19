import { describe, it, expect, vi } from 'vitest';
import { createTravelerService } from '../traveler.service.js';
import type { FamilyResponse } from '@wsb/shared';

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

// ─── Tests ───────────────────────────────────────────────────

describe('TravelerService — getFamily', () => {
  it('should return family with multiple members and their QR tokens', async () => {
    const db = createMockDb([
      // 1. traveler role_type + family_id
      { rows: [{ role_type: 'representative', family_id: 'fam-1' }] },
      // 2. family members
      {
        rows: [
          { traveler_id: 'tid-1', full_name_raw: 'Alice Rep', role_type: 'representative' },
          { traveler_id: 'tid-2', full_name_raw: 'Bob Traveler', role_type: 'traveler' },
          { traveler_id: 'tid-3', full_name_raw: 'Charlie Minor', role_type: 'minor' },
        ],
      },
      // 3-5. QR tokens for each member
      { rows: [{ token_value: 'qr-alice' }] },
      { rows: [{ token_value: 'qr-bob' }] },
      { rows: [{ token_value: 'qr-charlie' }] },
    ]);

    const service = createTravelerService({ db });
    const result = await service.getFamily('tid-1');

    expect(result).toEqual({
      family_id: 'fam-1',
      members: [
        { traveler_id: 'tid-1', full_name: 'Alice Rep', role_type: 'representative', qr_token_value: 'qr-alice' },
        { traveler_id: 'tid-2', full_name: 'Bob Traveler', role_type: 'traveler', qr_token_value: 'qr-bob' },
        { traveler_id: 'tid-3', full_name: 'Charlie Minor', role_type: 'minor', qr_token_value: 'qr-charlie' },
      ],
    } satisfies FamilyResponse);
  });

  it('should return 403 forbidden for non-representative role', async () => {
    const db = createMockDb([
      { rows: [{ role_type: 'traveler', family_id: 'fam-1' }] },
    ]);

    const service = createTravelerService({ db });
    const result = await service.getFamily('tid-regular');

    expect(result).toEqual({
      error: 'forbidden',
      message: 'Only family representatives can access family data',
    });
    // Should only query once (the traveler lookup) and stop
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('should return empty members array when no family members exist', async () => {
    const db = createMockDb([
      // 1. traveler is representative with a family_id
      { rows: [{ role_type: 'representative', family_id: 'fam-empty' }] },
      // 2. no members found
      { rows: [] },
    ]);

    const service = createTravelerService({ db });
    const result = await service.getFamily('tid-lonely');

    expect(result).toEqual({
      family_id: 'fam-empty',
      members: [],
    } satisfies FamilyResponse);
  });

  it('should include empty string qr_token_value when member has no active QR token', async () => {
    const db = createMockDb([
      { rows: [{ role_type: 'representative', family_id: 'fam-2' }] },
      {
        rows: [
          { traveler_id: 'tid-a', full_name_raw: 'With QR', role_type: 'representative' },
          { traveler_id: 'tid-b', full_name_raw: 'No QR', role_type: 'minor' },
        ],
      },
      // QR for tid-a
      { rows: [{ token_value: 'qr-a-token' }] },
      // No QR for tid-b
      { rows: [] },
    ]);

    const service = createTravelerService({ db });
    const result = await service.getFamily('tid-a');

    expect(result).not.toHaveProperty('error');
    const family = result as FamilyResponse;
    expect(family.members).toHaveLength(2);
    expect(family.members[0].qr_token_value).toBe('qr-a-token');
    expect(family.members[1].qr_token_value).toBe('');
  });

  it('should return not_found when traveler does not exist', async () => {
    const db = createMockDb([{ rows: [] }]);

    const service = createTravelerService({ db });
    const result = await service.getFamily('nonexistent');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Traveler not found',
    });
  });

  it('should return not_found when representative has no family_id', async () => {
    const db = createMockDb([
      { rows: [{ role_type: 'representative', family_id: null }] },
    ]);

    const service = createTravelerService({ db });
    const result = await service.getFamily('tid-no-family');

    expect(result).toEqual({
      error: 'not_found',
      message: 'No family linked',
    });
  });
});
