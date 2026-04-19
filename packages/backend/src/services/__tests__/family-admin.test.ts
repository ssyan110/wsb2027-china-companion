import { describe, it, expect, vi } from 'vitest';
import { createFamilyService } from '../family.service.js';

// ─── Mock helpers ────────────────────────────────────────────

function createMockDb(queryResponses: Array<{ rows: Record<string, unknown>[] }> = []) {
  let callIndex = 0;
  const mockClient = {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [] };
      callIndex++;
      return Promise.resolve(response);
    }),
    release: vi.fn(),
  };
  return {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [] };
      callIndex++;
      return Promise.resolve(response);
    }),
    connect: vi.fn().mockResolvedValue(mockClient),
    _client: mockClient,
    _getCallIndex: () => callIndex,
  } as unknown as import('pg').Pool & { _client: typeof mockClient; _getCallIndex: () => number };
}

// ─── createFamily ────────────────────────────────────────────

describe('FamilyService — createFamily', () => {
  it('should create a family and set representative family_id', async () => {
    const db = createMockDb([
      // 1. traveler lookup
      { rows: [{ traveler_id: 'rep-1', role_type: 'representative', family_id: null }] },
      // 2. BEGIN (via client)
      { rows: [] },
      // 3. INSERT family
      { rows: [{ family_id: 'fam-new', representative_id: 'rep-1', created_at: '2025-01-01T00:00:00Z' }] },
      // 4. UPDATE traveler family_id
      { rows: [] },
      // 5. COMMIT
      { rows: [] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.createFamily('rep-1');

    expect(result).toEqual({
      family_id: 'fam-new',
      representative_id: 'rep-1',
      created_at: '2025-01-01T00:00:00Z',
    });
  });

  it('should return not_found when representative does not exist', async () => {
    const db = createMockDb([
      { rows: [] }, // traveler lookup returns nothing
    ]);

    const service = createFamilyService({ db });
    const result = await service.createFamily('nonexistent');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Representative traveler not found',
    });
  });

  it('should reject a minor as representative', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'minor-1', role_type: 'minor', family_id: null }] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.createFamily('minor-1');

    expect(result).toEqual({
      error: 'validation_error',
      message: 'A minor cannot be a family representative',
    });
  });
});

// ─── linkMember ──────────────────────────────────────────────

describe('FamilyService — linkMember', () => {
  it('should link a traveler to a family', async () => {
    const db = createMockDb([
      // 1. family lookup
      { rows: [{ family_id: 'fam-1' }] },
      // 2. traveler lookup
      { rows: [{ traveler_id: 'tid-2', role_type: 'traveler', guardian_id: null, access_status: 'invited' }] },
      // 3. UPDATE traveler
      { rows: [] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.linkMember('fam-1', 'tid-2');

    expect(result).toEqual({ success: true });
  });

  it('should return not_found when family does not exist', async () => {
    const db = createMockDb([
      { rows: [] }, // family lookup
    ]);

    const service = createFamilyService({ db });
    const result = await service.linkMember('nonexistent', 'tid-2');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Family not found',
    });
  });

  it('should return not_found when traveler does not exist', async () => {
    const db = createMockDb([
      { rows: [{ family_id: 'fam-1' }] }, // family exists
      { rows: [] }, // traveler lookup
    ]);

    const service = createFamilyService({ db });
    const result = await service.linkMember('fam-1', 'nonexistent');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Traveler not found',
    });
  });
});

// ─── assignGuardian ──────────────────────────────────────────

describe('FamilyService — assignGuardian', () => {
  it('should assign a guardian to a minor', async () => {
    const db = createMockDb([
      // 1. minor lookup
      { rows: [{ traveler_id: 'minor-1', role_type: 'minor' }] },
      // 2. guardian lookup
      { rows: [{ traveler_id: 'guardian-1', role_type: 'representative' }] },
      // 3. UPDATE minor
      { rows: [] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.assignGuardian('minor-1', 'guardian-1');

    expect(result).toEqual({ success: true });
  });

  it('should return not_found when minor does not exist', async () => {
    const db = createMockDb([
      { rows: [] }, // minor lookup
    ]);

    const service = createFamilyService({ db });
    const result = await service.assignGuardian('nonexistent', 'guardian-1');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Minor traveler not found',
    });
  });

  it('should reject when traveler is not a minor', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'adult-1', role_type: 'traveler' }] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.assignGuardian('adult-1', 'guardian-1');

    expect(result).toEqual({
      error: 'validation_error',
      message: 'Traveler is not a minor',
    });
  });

  it('should return not_found when guardian does not exist', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'minor-1', role_type: 'minor' }] },
      { rows: [] }, // guardian lookup
    ]);

    const service = createFamilyService({ db });
    const result = await service.assignGuardian('minor-1', 'nonexistent');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Guardian traveler not found',
    });
  });

  it('should reject a minor as guardian', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'minor-1', role_type: 'minor' }] },
      { rows: [{ traveler_id: 'minor-2', role_type: 'minor' }] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.assignGuardian('minor-1', 'minor-2');

    expect(result).toEqual({
      error: 'validation_error',
      message: 'Guardian cannot be a minor',
    });
  });
});

// ─── unlinkMember ────────────────────────────────────────────

describe('FamilyService — unlinkMember', () => {
  it('should unlink a non-representative member from a family', async () => {
    const db = createMockDb([
      // 1. family lookup
      { rows: [{ family_id: 'fam-1', representative_id: 'rep-1' }] },
      // 2. traveler lookup
      { rows: [{ traveler_id: 'tid-2', family_id: 'fam-1' }] },
      // 3. UPDATE traveler
      { rows: [] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.unlinkMember('fam-1', 'tid-2');

    expect(result).toEqual({ success: true });
  });

  it('should return not_found when family does not exist', async () => {
    const db = createMockDb([
      { rows: [] }, // family lookup
    ]);

    const service = createFamilyService({ db });
    const result = await service.unlinkMember('nonexistent', 'tid-2');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Family not found',
    });
  });

  it('should prevent unlinking the representative', async () => {
    const db = createMockDb([
      { rows: [{ family_id: 'fam-1', representative_id: 'rep-1' }] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.unlinkMember('fam-1', 'rep-1');

    expect(result).toEqual({
      error: 'validation_error',
      message: 'Cannot unlink the family representative. Reassign representative first.',
    });
  });

  it('should return not_found when traveler does not exist', async () => {
    const db = createMockDb([
      { rows: [{ family_id: 'fam-1', representative_id: 'rep-1' }] },
      { rows: [] }, // traveler lookup
    ]);

    const service = createFamilyService({ db });
    const result = await service.unlinkMember('fam-1', 'nonexistent');

    expect(result).toEqual({
      error: 'not_found',
      message: 'Traveler not found',
    });
  });

  it('should reject unlinking a traveler not in this family', async () => {
    const db = createMockDb([
      { rows: [{ family_id: 'fam-1', representative_id: 'rep-1' }] },
      { rows: [{ traveler_id: 'tid-2', family_id: 'fam-other' }] },
    ]);

    const service = createFamilyService({ db });
    const result = await service.unlinkMember('fam-1', 'tid-2');

    expect(result).toEqual({
      error: 'validation_error',
      message: 'Traveler is not a member of this family',
    });
  });
});
