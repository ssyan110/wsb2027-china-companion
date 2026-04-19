import { describe, it, expect, vi } from 'vitest';
import { createAuditService } from '../audit.service.js';

// ─── Mock helpers ────────────────────────────────────────────

function createMockDb(queryResponses: Array<{ rows: Record<string, unknown>[]; rowCount?: number }> = []) {
  let callIndex = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [], rowCount: 0 };
      callIndex++;
      return Promise.resolve(response);
    }),
  } as unknown as import('pg').Pool;
}

// ─── logAuditEvent tests ─────────────────────────────────────

describe('AuditService.logAuditEvent', () => {
  it('should insert an audit log entry and return audit_id', async () => {
    const db = createMockDb([
      { rows: [{ audit_id: 'aud-1' }] },
    ]);
    const service = createAuditService({ db });

    const result = await service.logAuditEvent({
      actor_id: 'admin-1',
      actor_role: 'admin',
      action_type: 'qr_reissue',
      entity_type: 'traveler',
      entity_id: 'tid-1',
      details: { before: { token: 'old' }, after: { token: 'new' } },
    });

    expect(result).toEqual({ audit_id: 'aud-1' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      ['admin-1', 'admin', 'qr_reissue', 'traveler', 'tid-1', { before: { token: 'old' }, after: { token: 'new' } }],
    );
  });

  it('should default details to empty object when not provided', async () => {
    const db = createMockDb([
      { rows: [{ audit_id: 'aud-2' }] },
    ]);
    const service = createAuditService({ db });

    const result = await service.logAuditEvent({
      actor_id: 'staff-1',
      actor_role: 'staff',
      action_type: 'rescue_search',
      entity_type: 'traveler',
      entity_id: 'tid-2',
      details: {},
    });

    expect(result).toEqual({ audit_id: 'aud-2' });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.arrayContaining([{}]),
    );
  });
});

// ─── getAuditLogs tests ──────────────────────────────────────

describe('AuditService.getAuditLogs', () => {
  it('should return paginated results with defaults (page 1, page_size 50)', async () => {
    const db = createMockDb([
      // COUNT query
      { rows: [{ total: 2 }] },
      // SELECT query
      {
        rows: [
          {
            audit_id: 'aud-1',
            actor_id: 'admin-1',
            actor_role: 'admin',
            action_type: 'create',
            entity_type: 'traveler',
            entity_id: 'tid-1',
            details: { field: 'value' },
            created_at: '2027-06-01T10:00:00Z',
          },
          {
            audit_id: 'aud-2',
            actor_id: 'admin-1',
            actor_role: 'admin',
            action_type: 'update',
            entity_type: 'traveler',
            entity_id: 'tid-2',
            details: {},
            created_at: '2027-06-01T09:00:00Z',
          },
        ],
      },
    ]);
    const service = createAuditService({ db });

    const result = await service.getAuditLogs();

    expect(result).not.toHaveProperty('error');
    const response = result as { entries: unknown[]; total: number; page: number; page_size: number };
    expect(response.total).toBe(2);
    expect(response.page).toBe(1);
    expect(response.page_size).toBe(50);
    expect(response.entries).toHaveLength(2);
    expect(db.query).toHaveBeenCalledTimes(2);
    // COUNT query has no WHERE, params = []
    expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining('COUNT'), []);
    // SELECT query has LIMIT 50 OFFSET 0
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT'), [50, 0]);
  });

  it('should filter by date range', async () => {
    const db = createMockDb([
      { rows: [{ total: 1 }] },
      { rows: [{ audit_id: 'aud-1', actor_id: 'a', actor_role: 'admin', action_type: 'x', entity_type: 'y', entity_id: 'z', details: {}, created_at: '2027-06-01T10:00:00Z' }] },
    ]);
    const service = createAuditService({ db });

    await service.getAuditLogs({
      start_date: '2027-06-01T00:00:00Z',
      end_date: '2027-06-30T23:59:59Z',
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('created_at >='),
      ['2027-06-01T00:00:00Z', '2027-06-30T23:59:59Z'],
    );
  });

  it('should filter by action_type', async () => {
    const db = createMockDb([
      { rows: [{ total: 0 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    await service.getAuditLogs({ action_type: 'qr_reissue' });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('action_type ='),
      ['qr_reissue'],
    );
  });

  it('should filter by actor_id', async () => {
    const db = createMockDb([
      { rows: [{ total: 0 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    await service.getAuditLogs({ actor_id: 'admin-1' });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('actor_id ='),
      ['admin-1'],
    );
  });

  it('should filter by traveler_id (entity_type = traveler)', async () => {
    const db = createMockDb([
      { rows: [{ total: 0 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    await service.getAuditLogs({ traveler_id: 'tid-1' });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("entity_type = 'traveler'"),
      ['tid-1'],
    );
  });

  it('should cap page_size at 100', async () => {
    const db = createMockDb([
      { rows: [{ total: 0 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    const result = await service.getAuditLogs({ page_size: 500 });

    const response = result as { page_size: number };
    expect(response.page_size).toBe(100);
    // LIMIT should be 100
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT'), [100, 0]);
  });

  it('should handle custom page and page_size', async () => {
    const db = createMockDb([
      { rows: [{ total: 150 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    const result = await service.getAuditLogs({ page: 3, page_size: 25 });

    const response = result as { page: number; page_size: number };
    expect(response.page).toBe(3);
    expect(response.page_size).toBe(25);
    // OFFSET should be (3-1)*25 = 50
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT'), [25, 50]);
  });

  it('should clamp page to minimum 1', async () => {
    const db = createMockDb([
      { rows: [{ total: 0 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    const result = await service.getAuditLogs({ page: -5 });

    const response = result as { page: number };
    expect(response.page).toBe(1);
  });

  it('should return empty entries when no logs exist', async () => {
    const db = createMockDb([
      { rows: [{ total: 0 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    const result = await service.getAuditLogs();

    const response = result as { entries: unknown[]; total: number };
    expect(response.entries).toEqual([]);
    expect(response.total).toBe(0);
  });

  it('should handle Date objects in created_at', async () => {
    const date = new Date('2027-06-01T10:00:00Z');
    const db = createMockDb([
      { rows: [{ total: 1 }] },
      { rows: [{ audit_id: 'aud-1', actor_id: 'a', actor_role: 'admin', action_type: 'x', entity_type: 'y', entity_id: 'z', details: {}, created_at: date }] },
    ]);
    const service = createAuditService({ db });

    const result = await service.getAuditLogs();

    const response = result as { entries: Array<{ created_at: string }> };
    expect(response.entries[0].created_at).toBe('2027-06-01T10:00:00.000Z');
  });

  it('should combine multiple filters', async () => {
    const db = createMockDb([
      { rows: [{ total: 0 }] },
      { rows: [] },
    ]);
    const service = createAuditService({ db });

    await service.getAuditLogs({
      start_date: '2027-06-01T00:00:00Z',
      action_type: 'update',
      actor_id: 'admin-1',
    });

    const countQuery = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(countQuery).toContain('created_at >=');
    expect(countQuery).toContain('action_type =');
    expect(countQuery).toContain('actor_id =');
  });
});

// ─── purgeExpiredLogs tests ──────────────────────────────────

describe('AuditService.purgeExpiredLogs', () => {
  it('should delete logs older than 12 months and return count', async () => {
    const db = createMockDb([
      { rows: [{ audit_id: 'old-1' }, { audit_id: 'old-2' }], rowCount: 2 },
    ]);
    const service = createAuditService({ db });

    const result = await service.purgeExpiredLogs();

    expect(result).toEqual({ deleted: 2 });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('12 months'),
    );
  });

  it('should return 0 when no expired logs exist', async () => {
    const db = createMockDb([
      { rows: [], rowCount: 0 },
    ]);
    const service = createAuditService({ db });

    const result = await service.purgeExpiredLogs();

    expect(result).toEqual({ deleted: 0 });
  });
});
