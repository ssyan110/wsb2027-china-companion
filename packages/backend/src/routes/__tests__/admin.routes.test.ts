import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { createAdminRouter } from '../admin.routes.js';
import type { Pool } from 'pg';

// ─── Minimal mock helpers ────────────────────────────────────

function createMockPool(): Pool {
  const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue(mockClient),
  } as unknown as Pool;
}

/**
 * Build a minimal Express app with the admin router mounted,
 * injecting auth context via a middleware stub.
 */
function buildApp(db: Pool, auth: { traveler_id?: string; role?: string } = {}) {
  const app = express();
  app.use(express.json());
  // Inject auth context
  app.use((req, _res, next) => {
    if (auth.traveler_id) req.traveler_id = auth.traveler_id;
    if (auth.role) (req as unknown as Record<string, unknown>).role = auth.role;
    next();
  });
  app.use('/api/v1/admin', createAdminRouter(db));
  return app;
}

/**
 * Lightweight supertest-like helper using Node's built-in fetch
 * against an ephemeral server.
 */
async function request(
  app: express.Express,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') { server.close(); reject(new Error('bad addr')); return; }
      const url = `http://127.0.0.1:${addr.port}${path}`;
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
      if (body !== undefined) opts.body = JSON.stringify(body);
      fetch(url, opts)
        .then(async (res) => {
          const text = await res.text();
          let json: Record<string, unknown> = {};
          try { json = JSON.parse(text); } catch { json = { raw: text }; }
          server.close();
          resolve({ status: res.status, body: json });
        })
        .catch((err) => { server.close(); reject(err); });
    });
  });
}

// ─── Tests ───────────────────────────────────────────────────

describe('Admin Routes - GET /api/v1/admin/master-list query parameter parsing', () => {
  let db: Pool;

  /**
   * The master-list service calls db.query 3 times:
   *   1. COUNT query (with WHERE clause containing filters)
   *   2. DATA query (SELECT with WHERE, ORDER BY, LIMIT, OFFSET)
   *   3. AUDIT log INSERT
   * We mock all three to return appropriate results.
   */
  function setupMasterListMocks(pool: Pool) {
    (pool.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })   // COUNT
      .mockResolvedValueOnce({ rows: [] })                 // DATA
      .mockResolvedValueOnce({ rows: [{ log_id: '1' }] }); // AUDIT INSERT
  }

  beforeEach(() => {
    db = createMockPool();
  });

  it('should pass invitee_type query parameter to the service', async () => {
    setupMasterListMocks(db);
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });

    const res = await request(app, 'GET', '/api/v1/admin/master-list?invitee_type=guest');
    expect(res.status).toBe(200);

    // Verify the COUNT query includes the invitee_type filter
    const countCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(countCall[0]).toContain('t.invitee_type');
    expect(countCall[1]).toContain('guest');
  });

  it('should pass pax_type query parameter to the service', async () => {
    setupMasterListMocks(db);
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });

    const res = await request(app, 'GET', '/api/v1/admin/master-list?pax_type=child');
    expect(res.status).toBe(200);

    const countCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(countCall[0]).toContain('t.pax_type');
    expect(countCall[1]).toContain('child');
  });

  it('should pass checkin_status query parameter to the service', async () => {
    setupMasterListMocks(db);
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });

    const res = await request(app, 'GET', '/api/v1/admin/master-list?checkin_status=checked_in');
    expect(res.status).toBe(200);

    const countCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(countCall[0]).toContain('t.checkin_status');
    expect(countCall[1]).toContain('checked_in');
  });

  it('should pass vip_tag query parameter to the service', async () => {
    setupMasterListMocks(db);
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });

    const res = await request(app, 'GET', '/api/v1/admin/master-list?vip_tag=VIP-A');
    expect(res.status).toBe(200);

    const countCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(countCall[0]).toContain('t.vip_tag');
    expect(countCall[1]).toContain('VIP-A');
  });

  it('should pass agent_code query parameter to the service', async () => {
    setupMasterListMocks(db);
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });

    const res = await request(app, 'GET', '/api/v1/admin/master-list?agent_code=AG-100');
    expect(res.status).toBe(200);

    const countCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(countCall[0]).toContain('t.agent_code');
    expect(countCall[1]).toContain('AG-100');
  });

  it('should pass multiple extended filters simultaneously', async () => {
    setupMasterListMocks(db);
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });

    const res = await request(
      app, 'GET',
      '/api/v1/admin/master-list?invitee_type=invitee&pax_type=adult&checkin_status=pending',
    );
    expect(res.status).toBe(200);

    const countCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(countCall[0]).toContain('t.invitee_type');
    expect(countCall[0]).toContain('t.pax_type');
    expect(countCall[0]).toContain('t.checkin_status');
    expect(countCall[1]).toContain('invitee');
    expect(countCall[1]).toContain('adult');
    expect(countCall[1]).toContain('pending');
  });
});

describe('Admin Routes - PATCH /api/v1/admin/travelers/:id enum validation', () => {
  let db: Pool;

  beforeEach(() => {
    db = createMockPool();
  });

  it('should return 400 for invalid gender value', async () => {
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });
    const res = await request(app, 'PATCH', '/api/v1/admin/travelers/tid-1', {
      gender: 'invalid_gender',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('gender');
    expect(res.body.message).toContain('male');
  });

  it('should return 400 for invalid invitee_type value', async () => {
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });
    const res = await request(app, 'PATCH', '/api/v1/admin/travelers/tid-1', {
      invitee_type: 'vip',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('invitee_type');
    expect(res.body.message).toContain('invitee');
  });

  it('should return 400 for invalid pax_type value', async () => {
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });
    const res = await request(app, 'PATCH', '/api/v1/admin/travelers/tid-1', {
      pax_type: 'teenager',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('pax_type');
    expect(res.body.message).toContain('adult');
  });

  it('should return 400 for invalid checkin_status value', async () => {
    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });
    const res = await request(app, 'PATCH', '/api/v1/admin/travelers/tid-1', {
      checkin_status: 'arrived',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.message).toContain('checkin_status');
    expect(res.body.message).toContain('pending');
  });

  it('should accept valid enum values and proceed to service', async () => {
    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })  // BEGIN
        .mockResolvedValueOnce({ rows: [{    // SELECT FOR UPDATE
          traveler_id: 'tid-1', booking_id: null, family_id: null, guardian_id: null,
          full_name_raw: 'Test', full_name_normalized: 'test', email_primary: 'test@test.com',
          role_type: 'traveler', access_status: 'activated',
          created_at: '2025-01-01', updated_at: '2025-01-01',
          gender: 'male', checkin_status: 'pending',
        }] })
        .mockResolvedValueOnce({ rows: [{    // UPDATE RETURNING
          traveler_id: 'tid-1', booking_id: null, family_id: null, guardian_id: null,
          full_name_raw: 'Test', full_name_normalized: 'test', email_primary: 'test@test.com',
          role_type: 'traveler', access_status: 'activated',
          created_at: '2025-01-01', updated_at: '2025-01-01',
        }] })
        .mockResolvedValueOnce({ rows: [] })  // audit INSERT
        .mockResolvedValueOnce({ rows: [] }), // COMMIT
      release: vi.fn(),
    };
    (db as unknown as { connect: ReturnType<typeof vi.fn> }).connect = vi.fn().mockResolvedValue(mockClient);

    const app = buildApp(db, { traveler_id: 'admin-1', role: 'admin' });
    const res = await request(app, 'PATCH', '/api/v1/admin/travelers/tid-1', {
      gender: 'female',
      invitee_type: 'guest',
      pax_type: 'child',
      checkin_status: 'checked_in',
    });
    expect(res.status).toBe(200);
    expect(res.body.traveler_id).toBe('tid-1');
  });

  it('should pass actor context with id and role to the service', async () => {
    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })  // BEGIN
        .mockResolvedValueOnce({ rows: [{    // SELECT FOR UPDATE
          traveler_id: 'tid-1', booking_id: null, family_id: null, guardian_id: null,
          full_name_raw: 'Test', full_name_normalized: 'test', email_primary: 'test@test.com',
          role_type: 'traveler', access_status: 'activated',
          created_at: '2025-01-01', updated_at: '2025-01-01',
          first_name: 'Old',
        }] })
        .mockResolvedValueOnce({ rows: [{    // UPDATE RETURNING
          traveler_id: 'tid-1', booking_id: null, family_id: null, guardian_id: null,
          full_name_raw: 'Test', full_name_normalized: 'test', email_primary: 'test@test.com',
          role_type: 'traveler', access_status: 'activated',
          created_at: '2025-01-01', updated_at: '2025-01-01',
        }] })
        .mockResolvedValueOnce({ rows: [] })  // audit INSERT
        .mockResolvedValueOnce({ rows: [] }), // COMMIT
      release: vi.fn(),
    };
    (db as unknown as { connect: ReturnType<typeof vi.fn> }).connect = vi.fn().mockResolvedValue(mockClient);

    const app = buildApp(db, { traveler_id: 'admin-42', role: 'super_admin' });
    const res = await request(app, 'PATCH', '/api/v1/admin/travelers/tid-1', {
      first_name: 'New',
    });
    expect(res.status).toBe(200);

    // Verify audit log was called with the correct actor_id and actor_role
    const auditCall = mockClient.query.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1][0]).toBe('admin-42');       // actor_id
    expect(auditCall![1][1]).toBe('super_admin');    // actor_role
  });

  it('should return 401 when no auth context', async () => {
    const app = buildApp(db, {});
    const res = await request(app, 'PATCH', '/api/v1/admin/travelers/tid-1', {
      gender: 'male',
    });
    expect(res.status).toBe(401);
  });
});
