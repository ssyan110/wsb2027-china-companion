import { describe, it, expect, vi } from 'vitest';
import { createTravelerService } from '../traveler.service.js';

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

describe('TravelerService', () => {
  describe('getProfile', () => {
    it('should return a full traveler profile with groups, hotel, and qr_token', async () => {
      const db = createMockDb([
        // 1. traveler base data
        {
          rows: [{
            traveler_id: 'tid-1',
            full_name_raw: 'Jane Doe',
            email_primary: 'jane@example.com',
            role_type: 'traveler',
            access_status: 'activated',
            family_id: 'fam-1',
          }],
        },
        // 2. group_ids
        { rows: [{ group_id: 'grp-a' }, { group_id: 'grp-b' }] },
        // 3. hotel
        {
          rows: [{
            hotel_id: 'htl-1',
            name: 'Grand Hotel',
            address_en: '123 Main St',
            address_cn: '主街123号',
          }],
        },
        // 4. qr_token
        { rows: [{ token_value: 'qr-abc-123' }] },
      ]);

      const service = createTravelerService({ db });
      const result = await service.getProfile('tid-1');

      expect(result).toEqual({
        traveler_id: 'tid-1',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        role_type: 'traveler',
        access_status: 'activated',
        family_id: 'fam-1',
        group_ids: ['grp-a', 'grp-b'],
        hotel: {
          hotel_id: 'htl-1',
          name: 'Grand Hotel',
          address_en: '123 Main St',
          address_cn: '主街123号',
        },
        qr_token: 'qr-abc-123',
      });
      expect(db.query).toHaveBeenCalledTimes(4);
    });

    it('should return not_found when traveler does not exist', async () => {
      const db = createMockDb([{ rows: [] }]);
      const service = createTravelerService({ db });

      const result = await service.getProfile('nonexistent-id');

      expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should return null hotel when traveler has no hotel assignment', async () => {
      const db = createMockDb([
        {
          rows: [{
            traveler_id: 'tid-2',
            full_name_raw: 'John Smith',
            email_primary: 'john@example.com',
            role_type: 'traveler',
            access_status: 'invited',
            family_id: null,
          }],
        },
        { rows: [] },  // no groups
        { rows: [] },  // no hotel
        { rows: [{ token_value: 'qr-xyz' }] },
      ]);

      const service = createTravelerService({ db });
      const result = await service.getProfile('tid-2');

      expect(result).not.toHaveProperty('error');
      const profile = result as { hotel: unknown; family_id: unknown; group_ids: string[] };
      expect(profile.hotel).toBeNull();
      expect(profile.family_id).toBeNull();
      expect(profile.group_ids).toEqual([]);
    });

    it('should return empty string qr_token when no active token exists', async () => {
      const db = createMockDb([
        {
          rows: [{
            traveler_id: 'tid-3',
            full_name_raw: 'No QR User',
            email_primary: 'noqr@example.com',
            role_type: 'traveler',
            access_status: 'invited',
            family_id: null,
          }],
        },
        { rows: [] },  // no groups
        { rows: [] },  // no hotel
        { rows: [] },  // no qr token
      ]);

      const service = createTravelerService({ db });
      const result = await service.getProfile('tid-3');

      expect(result).not.toHaveProperty('error');
      const profile = result as { qr_token: string };
      expect(profile.qr_token).toBe('');
    });
  });

  describe('getQrToken', () => {
    it('should return token_value and traveler_name for active token', async () => {
      const db = createMockDb([
        {
          rows: [{
            token_value: 'qr-token-value-1',
            full_name_raw: 'Alice Wonderland',
          }],
        },
      ]);

      const service = createTravelerService({ db });
      const result = await service.getQrToken('tid-10');

      expect(result).toEqual({
        token_value: 'qr-token-value-1',
        traveler_name: 'Alice Wonderland',
      });
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should return not_found when no active QR token exists', async () => {
      const db = createMockDb([{ rows: [] }]);

      const service = createTravelerService({ db });
      const result = await service.getQrToken('tid-no-qr');

      expect(result).toEqual({ error: 'not_found', message: 'QR token not found' });
    });

    it('should query with the correct traveler_id and is_active filter', async () => {
      const db = createMockDb([
        { rows: [{ token_value: 'tok-1', full_name_raw: 'Bob' }] },
      ]);

      const service = createTravelerService({ db });
      await service.getQrToken('tid-check');

      const call = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('is_active = true');
      expect(call[1]).toEqual(['tid-check']);
    });
  });
});
