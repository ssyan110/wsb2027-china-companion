import { describe, it, expect, vi } from 'vitest';
import { createScanService } from '../scan.service.js';

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

// ─── getManifest tests ───────────────────────────────────────

describe('ScanService.getManifest', () => {
  it('should return all travelers with active QR tokens and eligibility arrays', async () => {
    const db = createMockDb([
      // 1. travelers with active QR tokens
      {
        rows: [
          {
            traveler_id: 'tid-1',
            full_name_raw: 'Alice Smith',
            family_id: 'fam-1',
            role_type: 'representative',
            qr_token_value: 'qr-alice',
            updated_at: '2027-06-01T10:00:00Z',
          },
          {
            traveler_id: 'tid-2',
            full_name_raw: 'Bob Jones',
            family_id: null,
            role_type: 'traveler',
            qr_token_value: 'qr-bob',
            updated_at: '2027-06-01T09:00:00Z',
          },
        ],
      },
      // 2. eligibility via groups
      {
        rows: [
          { traveler_id: 'tid-1', event_id: 'evt-gala' },
          { traveler_id: 'tid-1', event_id: 'evt-bus-05' },
          { traveler_id: 'tid-2', event_id: 'evt-gala' },
        ],
      },
      // 3. open events (no eligibility rules)
      {
        rows: [{ event_id: 'evt-opening' }],
      },
    ]);

    const service = createScanService({ db });
    const result = await service.getManifest();

    expect(result.travelers).toHaveLength(2);
    expect(result.version).toBe('2027-06-01T10:00:00.000Z');

    const alice = result.travelers.find((t) => t.traveler_id === 'tid-1')!;
    expect(alice.qr_token_value).toBe('qr-alice');
    expect(alice.full_name).toBe('Alice Smith');
    expect(alice.family_id).toBe('fam-1');
    expect(alice.role_type).toBe('representative');
    expect(alice.eligibility).toContain('evt-gala');
    expect(alice.eligibility).toContain('evt-bus-05');
    expect(alice.eligibility).toContain('evt-opening');

    const bob = result.travelers.find((t) => t.traveler_id === 'tid-2')!;
    expect(bob.eligibility).toContain('evt-gala');
    expect(bob.eligibility).toContain('evt-opening');
    expect(bob.eligibility).not.toContain('evt-bus-05');
  });

  it('should filter travelers by mode when mode is provided', async () => {
    const db = createMockDb([
      {
        rows: [
          {
            traveler_id: 'tid-1',
            full_name_raw: 'Alice',
            family_id: null,
            role_type: 'traveler',
            qr_token_value: 'qr-1',
            updated_at: '2027-06-01T10:00:00Z',
          },
          {
            traveler_id: 'tid-2',
            full_name_raw: 'Bob',
            family_id: null,
            role_type: 'traveler',
            qr_token_value: 'qr-2',
            updated_at: '2027-06-01T09:00:00Z',
          },
        ],
      },
      // eligibility: only tid-1 is eligible for evt-gala
      {
        rows: [{ traveler_id: 'tid-1', event_id: 'evt-gala' }],
      },
      // no open events
      { rows: [] },
    ]);

    const service = createScanService({ db });
    const result = await service.getManifest('evt-gala');

    expect(result.travelers).toHaveLength(1);
    expect(result.travelers[0].traveler_id).toBe('tid-1');
  });

  it('should return empty travelers array when no active QR tokens exist', async () => {
    const db = createMockDb([
      { rows: [] }, // no travelers
      { rows: [] }, // no eligibility
      { rows: [] }, // no open events
    ]);

    const service = createScanService({ db });
    const result = await service.getManifest();

    expect(result.travelers).toHaveLength(0);
    expect(result.version).toBeDefined();
  });

  it('should include open events in every travelers eligibility', async () => {
    const db = createMockDb([
      {
        rows: [
          {
            traveler_id: 'tid-1',
            full_name_raw: 'Charlie',
            family_id: null,
            role_type: 'traveler',
            qr_token_value: 'qr-charlie',
            updated_at: '2027-06-01T08:00:00Z',
          },
        ],
      },
      { rows: [] }, // no group-based eligibility
      { rows: [{ event_id: 'evt-open-1' }, { event_id: 'evt-open-2' }] }, // two open events
    ]);

    const service = createScanService({ db });
    const result = await service.getManifest();

    expect(result.travelers).toHaveLength(1);
    expect(result.travelers[0].eligibility).toEqual(['evt-open-1', 'evt-open-2']);
  });
});

// ─── getDeltaManifest tests ──────────────────────────────────

describe('ScanService.getDeltaManifest', () => {
  it('should return only travelers updated after since_version', async () => {
    const db = createMockDb([
      // 1. travelers updated since version
      {
        rows: [
          {
            traveler_id: 'tid-3',
            full_name_raw: 'Delta User',
            family_id: null,
            role_type: 'traveler',
            qr_token_value: 'qr-delta',
            updated_at: '2027-06-01T12:00:00Z',
          },
        ],
      },
      // 2. eligibility for changed travelers
      {
        rows: [{ traveler_id: 'tid-3', event_id: 'evt-lunch' }],
      },
      // 3. open events
      { rows: [] },
    ]);

    const service = createScanService({ db });
    const result = await service.getDeltaManifest('2027-06-01T10:00:00Z');

    expect('error' in result).toBe(false);
    const manifest = result as { travelers: unknown[]; version: string };
    expect(manifest.travelers).toHaveLength(1);
    expect(manifest.version).toBe('2027-06-01T12:00:00.000Z');
  });

  it('should return empty travelers when no changes since version', async () => {
    const db = createMockDb([
      { rows: [] }, // no travelers updated
    ]);

    const service = createScanService({ db });
    const result = await service.getDeltaManifest('2027-06-01T10:00:00Z');

    expect('error' in result).toBe(false);
    const manifest = result as { travelers: unknown[]; version: string };
    expect(manifest.travelers).toHaveLength(0);
    expect(manifest.version).toBe('2027-06-01T10:00:00Z');
  });

  it('should return invalid_version error for bad timestamp', async () => {
    const db = createMockDb([]);

    const service = createScanService({ db });
    const result = await service.getDeltaManifest('not-a-date');

    expect(result).toEqual({
      error: 'invalid_version',
      message: 'Invalid version format — expected ISO timestamp',
    });
  });
});

// ─── getScanModes tests ──────────────────────────────────────

describe('ScanService.getScanModes', () => {
  it('should return events for the current date as scan modes', async () => {
    const db = createMockDb([
      {
        rows: [
          { event_id: 'evt-bus-01', name: 'Bus 01 Boarding', event_type: 'bus' },
          { event_id: 'evt-gala', name: 'Gala Dinner', event_type: 'meal' },
        ],
      },
    ]);

    const service = createScanService({ db });
    const result = await service.getScanModes();

    expect(result.modes).toHaveLength(2);
    expect(result.modes[0]).toEqual({
      mode_id: 'evt-bus-01',
      name: 'Bus 01 Boarding',
      event_id: 'evt-bus-01',
      event_type: 'bus',
    });
    expect(result.modes[1]).toEqual({
      mode_id: 'evt-gala',
      name: 'Gala Dinner',
      event_id: 'evt-gala',
      event_type: 'meal',
    });
  });

  it('should return empty modes when no events for current date', async () => {
    const db = createMockDb([{ rows: [] }]);

    const service = createScanService({ db });
    const result = await service.getScanModes();

    expect(result.modes).toHaveLength(0);
  });
});
