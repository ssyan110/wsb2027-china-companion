import { describe, it, expect, vi } from 'vitest';
import { createRescueService } from '../rescue.service.js';

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

function createMockEmailService() {
  return {
    sendMagicLink: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAuditService() {
  return {
    logAuditEvent: vi.fn().mockResolvedValue({ audit_id: 'audit-1' }),
    getAuditLogs: vi.fn(),
    purgeExpiredLogs: vi.fn(),
  };
}

// ─── search tests ────────────────────────────────────────────

describe('RescueService.search', () => {
  it('should reject name queries shorter than 2 characters', async () => {
    const db = createMockDb();
    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    const result = await service.search('A', 'name', 'staff-1');
    expect(result).toEqual({
      error: 'validation_error',
      message: 'Name search requires at least 2 characters',
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should reject email queries shorter than 3 characters', async () => {
    const db = createMockDb();
    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    const result = await service.search('ab', 'email', 'staff-1');
    expect(result).toEqual({
      error: 'validation_error',
      message: 'Email search requires at least 3 characters',
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should perform name search using pg_trgm similarity and return ranked candidates', async () => {
    const auditService = createMockAuditService();
    const db = createMockDb([
      // search query result
      {
        rows: [
          {
            traveler_id: 'tid-1',
            full_name_raw: 'Alice Smith',
            email_primary: 'alice@example.com',
            booking_id: 'BK-001',
            family_id: 'fam-1',
            access_status: 'activated',
            match_score: '0.85',
          },
          {
            traveler_id: 'tid-2',
            full_name_raw: 'Alicia Smythe',
            email_primary: 'alicia@example.com',
            booking_id: 'BK-002',
            family_id: null,
            access_status: 'invited',
            match_score: '0.45',
          },
        ],
      },
      // audit log insert
      { rows: [{ audit_id: 'audit-1' }] },
    ]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService,
    });

    const result = await service.search('Alice Smith', 'name', 'staff-1');

    expect('candidates' in result).toBe(true);
    if (!('candidates' in result)) return;

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].traveler_id).toBe('tid-1');
    expect(result.candidates[0].full_name).toBe('Alice Smith');
    expect(result.candidates[0].match_score).toBe(0.85);
    expect(result.candidates[0].family_id).toBe('fam-1');

    expect(result.candidates[1].traveler_id).toBe('tid-2');
    expect(result.candidates[1].match_score).toBe(0.45);
    expect(result.candidates[1].family_id).toBeNull();

    // Verify the SQL used similarity on full_name_normalized
    const queryCall = db.query.mock.calls[0];
    expect(queryCall[0]).toContain('similarity(t.full_name_normalized');

    // Verify audit was logged
    expect(auditService.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'staff-1',
        action_type: 'rescue_search',
        details: expect.objectContaining({ query: 'Alice Smith', type: 'name', result_count: 2 }),
      }),
    );
  });

  it('should perform email search using LIKE prefix + trgm fallback', async () => {
    const db = createMockDb([
      {
        rows: [
          {
            traveler_id: 'tid-3',
            full_name_raw: 'Bob Jones',
            email_primary: 'bob@example.com',
            booking_id: 'BK-003',
            family_id: null,
            access_status: 'activated',
            match_score: '0.9',
          },
        ],
      },
      { rows: [{ audit_id: 'audit-2' }] },
    ]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    const result = await service.search('bob@', 'email', 'staff-1');

    expect('candidates' in result).toBe(true);
    if (!('candidates' in result)) return;

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].email).toBe('bob@example.com');

    // Verify the SQL used LIKE prefix + similarity fallback
    const queryCall = db.query.mock.calls[0];
    expect(queryCall[0]).toContain("LIKE $1 || '%'");
    expect(queryCall[0]).toContain('similarity(t.email_primary');
  });

  it('should return empty candidates when no matches found', async () => {
    const db = createMockDb([
      { rows: [] },
      { rows: [{ audit_id: 'audit-3' }] },
    ]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    const result = await service.search('zzzzz', 'name', 'staff-1');

    expect('candidates' in result).toBe(true);
    if (!('candidates' in result)) return;
    expect(result.candidates).toHaveLength(0);
  });

  it('should normalize name query before searching', async () => {
    const db = createMockDb([
      { rows: [] },
      { rows: [{ audit_id: 'audit-4' }] },
    ]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    await service.search('  ALICE  SMITH  ', 'name', 'staff-1');

    // normalizeName trims, lowercases, strips diacritics, collapses whitespace
    const queryCall = db.query.mock.calls[0];
    expect(queryCall[1][0]).toBe('alice smith');
  });
});

// ─── resendMagicLink tests ───────────────────────────────────

describe('RescueService.resendMagicLink', () => {
  it('should generate and send a new magic link for an existing traveler', async () => {
    const emailService = createMockEmailService();
    const auditService = createMockAuditService();
    const db = createMockDb([
      // traveler lookup
      { rows: [{ traveler_id: 'tid-1', email_primary: 'alice@example.com' }] },
      // magic_links insert
      { rows: [] },
      // update access_status
      { rows: [], rowCount: 1 },
      // audit log (handled by auditService mock)
    ]);

    const service = createRescueService({ db, emailService, auditService });
    const result = await service.resendMagicLink('tid-1', 'staff-1');

    expect(result).toEqual({ success: true });
    expect(emailService.sendMagicLink).toHaveBeenCalledWith('alice@example.com', expect.any(String));

    // Verify access_status updated to 'rescued'
    const updateCall = db.query.mock.calls[2];
    expect(updateCall[0]).toContain("access_status = 'rescued'");

    // Verify audit logged
    expect(auditService.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'staff-1',
        action_type: 'rescue_resend_magic_link',
        entity_id: 'tid-1',
      }),
    );
  });

  it('should return not_found when traveler does not exist', async () => {
    const db = createMockDb([{ rows: [] }]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    const result = await service.resendMagicLink('nonexistent', 'staff-1');
    expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
  });
});

// ─── getTravelerProfile tests ────────────────────────────────

describe('RescueService.getTravelerProfile', () => {
  it('should return full traveler profile with QR token, groups, and hotel', async () => {
    const auditService = createMockAuditService();
    const db = createMockDb([
      // traveler lookup
      {
        rows: [{
          traveler_id: 'tid-1',
          full_name_raw: 'Alice Smith',
          email_primary: 'alice@example.com',
          role_type: 'traveler',
          access_status: 'activated',
          family_id: 'fam-1',
        }],
      },
      // group_ids
      { rows: [{ group_id: 'grp-1' }, { group_id: 'grp-2' }] },
      // hotel
      {
        rows: [{
          hotel_id: 'htl-1',
          name: 'Grand Hotel',
          address_en: '123 Main St',
          address_cn: '主街123号',
        }],
      },
      // QR token
      { rows: [{ token_value: 'qr-alice-token' }] },
    ]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService,
    });

    const result = await service.getTravelerProfile('tid-1', 'staff-1');

    expect('traveler_id' in result).toBe(true);
    if (!('traveler_id' in result)) return;

    expect(result.traveler_id).toBe('tid-1');
    expect(result.full_name).toBe('Alice Smith');
    expect(result.email).toBe('alice@example.com');
    expect(result.role_type).toBe('traveler');
    expect(result.access_status).toBe('activated');
    expect(result.family_id).toBe('fam-1');
    expect(result.group_ids).toEqual(['grp-1', 'grp-2']);
    expect(result.hotel).toEqual({
      hotel_id: 'htl-1',
      name: 'Grand Hotel',
      address_en: '123 Main St',
      address_cn: '主街123号',
    });
    expect(result.qr_token).toBe('qr-alice-token');

    // Verify audit logged
    expect(auditService.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'staff-1',
        action_type: 'rescue_view_profile',
        entity_id: 'tid-1',
      }),
    );
  });

  it('should return not_found when traveler does not exist', async () => {
    const db = createMockDb([{ rows: [] }]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    const result = await service.getTravelerProfile('nonexistent', 'staff-1');
    expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
  });

  it('should handle traveler with no hotel, no groups, and no QR token', async () => {
    const db = createMockDb([
      // traveler lookup
      {
        rows: [{
          traveler_id: 'tid-2',
          full_name_raw: 'Bob Jones',
          email_primary: 'bob@example.com',
          role_type: 'traveler',
          access_status: 'invited',
          family_id: null,
        }],
      },
      // no groups
      { rows: [] },
      // no hotel
      { rows: [] },
      // no QR token
      { rows: [] },
    ]);

    const service = createRescueService({
      db,
      emailService: createMockEmailService(),
      auditService: createMockAuditService(),
    });

    const result = await service.getTravelerProfile('tid-2', 'staff-1');

    expect('traveler_id' in result).toBe(true);
    if (!('traveler_id' in result)) return;

    expect(result.family_id).toBeNull();
    expect(result.group_ids).toEqual([]);
    expect(result.hotel).toBeNull();
    expect(result.qr_token).toBe('');
  });
});
