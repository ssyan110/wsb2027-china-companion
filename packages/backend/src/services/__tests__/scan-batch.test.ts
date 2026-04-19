import { describe, it, expect, vi } from 'vitest';
import { createScanService } from '../scan.service.js';
import type { ScanBatchRequest } from '@wsb/shared';

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

const STAFF_ID = 'staff-001';

function validScan(overrides: Partial<ScanBatchRequest['scans'][number]> = {}): ScanBatchRequest['scans'][number] {
  return {
    qr_token_value: 'qr-abc',
    scan_mode: 'evt-bus-01',
    result: 'pass',
    device_id: 'device-01',
    scanned_at: '2027-06-15T08:30:00Z',
    ...overrides,
  };
}

// ─── ingestScanBatch tests ───────────────────────────────────

describe('ScanService.ingestScanBatch', () => {
  it('should ingest all valid scan entries and return ingested count', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        validScan(),
        validScan({ qr_token_value: 'qr-def', result: 'fail' }),
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(db.query).toHaveBeenCalledOnce();

    const [sql, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(sql).toContain('INSERT INTO scan_logs');
    expect(params).toHaveLength(14); // 7 params per entry × 2 entries
    expect(params[0]).toBe(STAFF_ID);
  });

  it('should reject entries missing required fields', async () => {
    const db = createMockDb([]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        { qr_token_value: '', scan_mode: 'evt-1', result: 'pass', device_id: 'dev-1', scanned_at: '2027-06-15T08:30:00Z' },
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(0);
    expect(result.errors[0].reason).toContain('qr_token_value');
  });

  it('should reject entries with multiple missing fields', async () => {
    const db = createMockDb([]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        { qr_token_value: '', scan_mode: '', result: 'pass' as const, device_id: '', scanned_at: '' },
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('qr_token_value');
    expect(result.errors[0].reason).toContain('scan_mode');
    expect(result.errors[0].reason).toContain('device_id');
    expect(result.errors[0].reason).toContain('scanned_at');
  });

  it('should require override_reason when result is override', async () => {
    const db = createMockDb([]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        validScan({ result: 'override' }),
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('override_reason');
  });

  it('should accept override entries with override_reason', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        validScan({ result: 'override', override_reason: 'Manager Approved' }),
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(1);
    expect(result.errors).toHaveLength(0);

    const [, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params[4]).toBe('Manager Approved');
  });

  it('should handle mixed valid and invalid entries', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        validScan(),                                    // index 0: valid
        validScan({ result: 'override' }),              // index 1: invalid (missing override_reason)
        validScan({ qr_token_value: 'qr-xyz' }),       // index 2: valid
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(1);
  });

  it('should return zero ingested and no DB call when all entries are invalid', async () => {
    const db = createMockDb([]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        validScan({ result: 'override' }),  // missing override_reason
        validScan({ device_id: '' }),        // missing device_id
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(0);
    expect(result.errors).toHaveLength(2);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should handle empty scans array', async () => {
    const db = createMockDb([]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = { scans: [] };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should set override_reason to null for non-override results', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [validScan({ result: 'pass' })],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(1);
    const [, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params[4]).toBeNull(); // override_reason should be null
  });

  it('should pass staff_id for all entries in the bulk insert', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        validScan({ qr_token_value: 'qr-1' }),
        validScan({ qr_token_value: 'qr-2' }),
        validScan({ qr_token_value: 'qr-3' }),
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(3);
    const [, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    // staff_id is at positions 0, 7, 14 (every 7th param starting from 0)
    expect(params[0]).toBe(STAFF_ID);
    expect(params[7]).toBe(STAFF_ID);
    expect(params[14]).toBe(STAFF_ID);
  });

  it('should accept all valid scan result types', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createScanService({ db });

    const request: ScanBatchRequest = {
      scans: [
        validScan({ result: 'pass' }),
        validScan({ result: 'fail' }),
        validScan({ result: 'wrong_assignment' }),
        validScan({ result: 'override', override_reason: 'VIP Exception' }),
      ],
    };

    const result = await service.ingestScanBatch(STAFF_ID, request);

    expect(result.ingested).toBe(4);
    expect(result.errors).toHaveLength(0);
  });
});
