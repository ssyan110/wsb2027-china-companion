import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMasterListService } from '../master-list.service.js';
import type { MasterListQueryParams, RoleType } from '@wsb/shared';

// ─── Mock helpers ────────────────────────────────────────────

function makeMockRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    traveler_id: 'tid-1',
    booking_id: 'BK-001',
    family_id: null,
    representative_id: null,
    guardian_id: null,
    full_name_raw: 'Jane Doe',
    full_name_normalized: 'jane doe',
    email_primary: 'jane@example.com',
    email_aliases: ['alias@example.com'],
    passport_name: 'JANE DOE',
    phone: '555-867-1234',
    role_type: 'traveler',
    access_status: 'activated',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    groups: ['Group A'],
    hotels: ['Hotel X'],
    flights: [{ flight_number: 'AA100', arrival_time: '2025-06-01T10:00:00Z' }],
    bus_assignments: [{ bus_number: 'B1', event_name: 'Gala' }],
    qr_active: true,
    ...overrides,
  };
}

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

function createMockAuditService() {
  return {
    logAuditEvent: vi.fn().mockResolvedValue({ audit_id: 'aud-1' }),
    getAuditLogs: vi.fn(),
    purgeExpiredLogs: vi.fn(),
  };
}

const adminActor = { id: 'actor-1', role: 'admin' as RoleType };
const superAdminActor = { id: 'actor-2', role: 'super_admin' as RoleType };

// ─── Tests ───────────────────────────────────────────────────

describe('MasterListService', () => {
  let auditService: ReturnType<typeof createMockAuditService>;

  beforeEach(() => {
    auditService = createMockAuditService();
  });

  // ── query: pagination defaults ──────────────────────────────

  describe('query - pagination', () => {
    it('should use default pagination (page=1, page_size=50) when no params provided', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },   // COUNT
        { rows: [] },               // data
      ]);
      const service = createMasterListService({ db, auditService });

      const result = await service.query({}, adminActor);

      expect(result.page).toBe(1);
      expect(result.page_size).toBe(50);
      expect(result.total).toBe(0);
      expect(result.total_pages).toBe(1);
      expect(result.data).toEqual([]);
    });

    it('should use custom page and page_size parameters', async () => {
      const db = createMockDb([
        { rows: [{ total: 200 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      const result = await service.query({ page: 3, page_size: 25 }, adminActor);

      expect(result.page).toBe(3);
      expect(result.page_size).toBe(25);
      expect(result.total_pages).toBe(8);
      // Verify LIMIT/OFFSET passed to data query
      const dataCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[1];
      const dataValues = dataCall[1] as unknown[];
      expect(dataValues).toContain(25);  // LIMIT
      expect(dataValues).toContain(50);  // OFFSET = (3-1)*25
    });
  });

  // ── query: search parameter ─────────────────────────────────

  describe('query - search', () => {
    it('should generate ILIKE conditions when q parameter is provided', async () => {
      const db = createMockDb([
        { rows: [{ total: 1 }] },
        { rows: [makeMockRow()] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ q: 'jane' }, adminActor);

      const countCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
      const countSQL = countCall[0] as string;
      expect(countSQL).toContain('ILIKE');
      expect(countSQL).toContain('full_name_normalized');
      expect(countSQL).toContain('email_primary');
      const countValues = countCall[1] as unknown[];
      expect(countValues).toContain('%jane%');
    });
  });

  // ── query: filter parameters ────────────────────────────────

  describe('query - filters', () => {
    it('should filter by role_type', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ role_type: 'admin' as RoleType }, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('role_type');
      const countValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
      expect(countValues).toContain('admin');
    });

    it('should filter by access_status', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ access_status: 'activated' as any }, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('access_status');
    });

    it('should filter by group_id', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ group_id: 'grp-1' }, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('traveler_groups');
      expect(countSQL).toContain('group_id');
    });

    it('should filter by hotel_id', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ hotel_id: 'htl-1' }, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('traveler_hotels');
      expect(countSQL).toContain('hotel_id');
    });

    it('should filter by invitee_type', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ invitee_type: 'guest' } as any, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('t.invitee_type');
      const countValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
      expect(countValues).toContain('guest');
    });

    it('should filter by pax_type', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ pax_type: 'child' } as any, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('t.pax_type');
      const countValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
      expect(countValues).toContain('child');
    });

    it('should filter by checkin_status', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ checkin_status: 'checked_in' } as any, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('t.checkin_status');
      const countValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
      expect(countValues).toContain('checked_in');
    });

    it('should filter by vip_tag', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ vip_tag: 'VIP-A' } as any, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('t.vip_tag');
      const countValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
      expect(countValues).toContain('VIP-A');
    });

    it('should filter by agent_code', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ agent_code: 'AG-100' } as any, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('t.agent_code');
      const countValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
      expect(countValues).toContain('AG-100');
    });

    it('should combine multiple extended filters with AND logic', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({
        invitee_type: 'invitee',
        pax_type: 'adult',
        checkin_status: 'pending',
      } as any, adminActor);

      const countSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(countSQL).toContain('t.invitee_type');
      expect(countSQL).toContain('t.pax_type');
      expect(countSQL).toContain('t.checkin_status');
      // All conditions should be AND-joined
      expect(countSQL).toContain('AND');
      const countValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
      expect(countValues).toContain('invitee');
      expect(countValues).toContain('adult');
      expect(countValues).toContain('pending');
    });
  });

  // ── query: sort validation ──────────────────────────────────

  describe('query - sort', () => {
    it('should use a valid sort column', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ sort_by: 'email_primary', sort_order: 'asc' }, adminActor);

      const dataSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
      expect(dataSQL).toContain('ORDER BY t.email_primary asc');
    });

    it('should fall back to created_at for invalid sort column', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ sort_by: 'DROP TABLE; --' }, adminActor);

      const dataSQL = (db.query as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
      expect(dataSQL).toContain('ORDER BY t.created_at');
    });
  });

  // ── query: PII masking ──────────────────────────────────────

  describe('query - PII masking', () => {
    it('should apply PII masking by default for admin role', async () => {
      const db = createMockDb([
        { rows: [{ total: 1 }] },
        { rows: [makeMockRow()] },
      ]);
      const service = createMasterListService({ db, auditService });

      const result = await service.query({}, adminActor);

      expect(result.data).toHaveLength(1);
      const row = result.data[0];
      // email should be masked: j***@example.com
      expect(row.email_primary).toBe('j***@example.com');
      // phone should be masked
      expect(row.phone).toContain('*');
      expect(row.phone).toContain('1234');
      // passport_name should be masked
      expect(row.passport_name).not.toBe('JANE DOE');
      expect(row.passport_name![0]).toBe('J');
    });

    it('should return unmasked data for super_admin with unmask=true', async () => {
      const db = createMockDb([
        { rows: [{ total: 1 }] },
        { rows: [makeMockRow()] },
      ]);
      const service = createMasterListService({ db, auditService });

      const result = await service.query({ unmask: true }, superAdminActor);

      const row = result.data[0];
      expect(row.email_primary).toBe('jane@example.com');
      expect(row.phone).toBe('555-867-1234');
      expect(row.passport_name).toBe('JANE DOE');
    });
  });

  // ── query: field projection ─────────────────────────────────

  describe('query - field projection', () => {
    it('should remove email_aliases and guardian_id for admin role', async () => {
      const db = createMockDb([
        { rows: [{ total: 1 }] },
        { rows: [makeMockRow({ guardian_id: 'gid-1', email_aliases: ['a@b.com'] })] },
      ]);
      const service = createMasterListService({ db, auditService });

      const result = await service.query({}, adminActor);

      const row = result.data[0];
      expect(row).not.toHaveProperty('email_aliases');
      expect(row).not.toHaveProperty('guardian_id');
    });

    it('should include all fields for super_admin role', async () => {
      const db = createMockDb([
        { rows: [{ total: 1 }] },
        { rows: [makeMockRow({ guardian_id: 'gid-1', email_aliases: ['a@b.com'] })] },
      ]);
      const service = createMasterListService({ db, auditService });

      const result = await service.query({}, superAdminActor);

      const row = result.data[0];
      expect(row).toHaveProperty('email_aliases');
      expect(row).toHaveProperty('guardian_id');
    });
  });

  // ── Audit logging ───────────────────────────────────────────

  describe('audit logging', () => {
    it('should log master_list.view for normal query access', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({}, adminActor);

      expect(auditService.logAuditEvent).toHaveBeenCalledTimes(1);
      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'actor-1',
          actor_role: 'admin',
          action_type: 'master_list.view',
          entity_type: 'traveler_list',
        }),
      );
    });

    it('should log master_list.view_unmasked for super_admin with unmask=true', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      const service = createMasterListService({ db, auditService });

      await service.query({ unmask: true }, superAdminActor);

      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'master_list.view_unmasked',
          actor_role: 'super_admin',
        }),
      );
    });

    it('should log master_list.export before yielding CSV data', async () => {
      const db = createMockDb([
        { rows: [{ total: 1 }] },   // COUNT for export
        { rows: [makeMockRow()] },   // first batch
      ]);
      const service = createMasterListService({ db, auditService });

      const gen = service.exportCsv({}, adminActor);
      // Consume the first yielded value (header line)
      const first = await gen.next();
      expect(first.done).toBe(false);

      // Audit should have been called before any data was yielded
      expect(auditService.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'master_list.export',
          entity_type: 'traveler_list',
        }),
      );
    });

    it('should fail the request when audit log write fails (fail closed)', async () => {
      const db = createMockDb([
        { rows: [{ total: 0 }] },
        { rows: [] },
      ]);
      auditService.logAuditEvent.mockRejectedValueOnce(new Error('Audit DB down'));
      const service = createMasterListService({ db, auditService });

      await expect(service.query({}, adminActor)).rejects.toThrow('Audit DB down');
    });
  });

  // ── Error cases ─────────────────────────────────────────────

  describe('error cases', () => {
    it('should propagate database query failure as error', async () => {
      const db = {
        query: vi.fn().mockRejectedValue(new Error('Connection refused')),
      } as unknown as import('pg').Pool;
      const service = createMasterListService({ db, auditService });

      await expect(service.query({}, adminActor)).rejects.toThrow('Connection refused');
    });
  });
});
