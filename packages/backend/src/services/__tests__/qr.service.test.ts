import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQrService } from '../qr.service.js';

// ─── Mock helpers ────────────────────────────────────────────

interface MockClient {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

function createMockClient(queryResponses: Array<{ rows: Record<string, unknown>[] }>): MockClient {
  let callIndex = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [] };
      callIndex++;
      return Promise.resolve(response);
    }),
    release: vi.fn(),
  };
}

function createMockPool(client: MockClient) {
  return {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as import('pg').Pool;
}

// ─── Tests ───────────────────────────────────────────────────

describe('QrService', () => {
  describe('reissueToken', () => {
    const travelerId = 'traveler-001';
    const adminId = 'admin-001';
    const adminRole = 'admin';

    it('should invalidate old token, generate new token, and log audit event', async () => {
      const oldTokenHash = 'abc123oldHash';
      const oldTokenId = 'token-id-old';

      const client = createMockClient([
        { rows: [] },                                                    // BEGIN
        { rows: [{ token_id: oldTokenId, token_hash: oldTokenHash }] },  // SELECT existing
        { rows: [] },                                                    // UPDATE set is_active=false
        { rows: [] },                                                    // DELETE old row
        { rows: [] },                                                    // INSERT new token
        { rows: [] },                                                    // INSERT audit_log
        { rows: [] },                                                    // COMMIT
      ]);
      const pool = createMockPool(client);
      const service = createQrService({ db: pool });

      const result = await service.reissueToken(travelerId, adminId, adminRole);

      // Should return a new token value
      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('new_qr_token_value');
      const success = result as { new_qr_token_value: string };
      expect(success.new_qr_token_value).toBeDefined();
      expect(typeof success.new_qr_token_value).toBe('string');
      expect(success.new_qr_token_value.length).toBeGreaterThan(0);

      // Verify transaction flow
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalledOnce();
    });

    it('should return no_active_token error when traveler has no active token', async () => {
      const client = createMockClient([
        { rows: [] },  // BEGIN
        { rows: [] },  // SELECT existing — no active token
        { rows: [] },  // ROLLBACK
      ]);
      const pool = createMockPool(client);
      const service = createQrService({ db: pool });

      const result = await service.reissueToken(travelerId, adminId, adminRole);

      expect(result).toEqual({
        error: 'no_active_token',
        message: 'No active QR token found for this traveler',
      });
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalledOnce();
    });

    it('should invalidate the existing token with revoked_at timestamp', async () => {
      const oldTokenId = 'token-id-123';
      const client = createMockClient([
        { rows: [] },                                                       // BEGIN
        { rows: [{ token_id: oldTokenId, token_hash: 'oldhash' }] },       // SELECT existing
        { rows: [] },                                                       // UPDATE invalidate
        { rows: [] },                                                       // DELETE old
        { rows: [] },                                                       // INSERT new
        { rows: [] },                                                       // INSERT audit
        { rows: [] },                                                       // COMMIT
      ]);
      const pool = createMockPool(client);
      const service = createQrService({ db: pool });

      await service.reissueToken(travelerId, adminId, adminRole);

      // The 3rd call (index 2) should be the UPDATE to invalidate
      const updateCall = client.query.mock.calls[2];
      expect(updateCall[0]).toContain('UPDATE qr_tokens SET is_active = false');
      expect(updateCall[0]).toContain('revoked_at = NOW()');
      expect(updateCall[1]).toEqual([oldTokenId]);
    });

    it('should insert a new token with SHA-256 hash', async () => {
      const client = createMockClient([
        { rows: [] },                                                       // BEGIN
        { rows: [{ token_id: 'old-id', token_hash: 'oldhash' }] },         // SELECT existing
        { rows: [] },                                                       // UPDATE invalidate
        { rows: [] },                                                       // DELETE old
        { rows: [] },                                                       // INSERT new
        { rows: [] },                                                       // INSERT audit
        { rows: [] },                                                       // COMMIT
      ]);
      const pool = createMockPool(client);
      const service = createQrService({ db: pool });

      const result = await service.reissueToken(travelerId, adminId, adminRole);
      const success = result as { new_qr_token_value: string };

      // The 5th call (index 4) should be the INSERT for the new token
      const insertCall = client.query.mock.calls[4];
      expect(insertCall[0]).toContain('INSERT INTO qr_tokens');
      expect(insertCall[1][0]).toBe(travelerId);
      expect(insertCall[1][1]).toBe(success.new_qr_token_value);
      // Verify hash is a 64-char hex string (SHA-256)
      const tokenHash = insertCall[1][2] as string;
      expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should log audit event with old and new token hashes', async () => {
      const oldTokenHash = 'deadbeef1234';
      const client = createMockClient([
        { rows: [] },                                                           // BEGIN
        { rows: [{ token_id: 'old-id', token_hash: oldTokenHash }] },          // SELECT existing
        { rows: [] },                                                           // UPDATE invalidate
        { rows: [] },                                                           // DELETE old
        { rows: [] },                                                           // INSERT new
        { rows: [] },                                                           // INSERT audit
        { rows: [] },                                                           // COMMIT
      ]);
      const pool = createMockPool(client);
      const service = createQrService({ db: pool });

      await service.reissueToken(travelerId, adminId, adminRole);

      // The 6th call (index 5) should be the audit log INSERT
      const auditCall = client.query.mock.calls[5];
      expect(auditCall[0]).toContain('INSERT INTO audit_logs');
      expect(auditCall[1][0]).toBe(adminId);        // actor_id
      expect(auditCall[1][1]).toBe(adminRole);       // actor_role
      expect(auditCall[1][2]).toBe('qr_reissue');    // action_type
      expect(auditCall[1][3]).toBe('qr_token');      // entity_type
      expect(auditCall[1][4]).toBe(travelerId);      // entity_id

      const details = JSON.parse(auditCall[1][5] as string);
      expect(details.old_token_hash).toBe(oldTokenHash);
      expect(details.new_token_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should rollback and release client on error', async () => {
      const client = createMockClient([
        { rows: [] },                                                       // BEGIN
        { rows: [{ token_id: 'old-id', token_hash: 'oldhash' }] },         // SELECT existing
      ]);
      // Make the UPDATE call throw
      client.query.mockImplementationOnce(() => Promise.resolve({ rows: [] }))  // BEGIN
        .mockImplementationOnce(() => Promise.resolve({ rows: [{ token_id: 'old-id', token_hash: 'oldhash' }] }))  // SELECT
        .mockImplementationOnce(() => Promise.reject(new Error('DB error')));  // UPDATE fails

      const pool = createMockPool(client);
      const service = createQrService({ db: pool });

      await expect(service.reissueToken(travelerId, adminId, adminRole)).rejects.toThrow('DB error');

      // Should have called ROLLBACK
      const rollbackCall = client.query.mock.calls.find(
        (call: unknown[]) => call[0] === 'ROLLBACK',
      );
      expect(rollbackCall).toBeDefined();
      expect(client.release).toHaveBeenCalledOnce();
    });

    it('should generate a unique token on each call', async () => {
      const makeClient = () =>
        createMockClient([
          { rows: [] },
          { rows: [{ token_id: 'old-id', token_hash: 'oldhash' }] },
          { rows: [] },
          { rows: [] },
          { rows: [] },
          { rows: [] },
          { rows: [] },
        ]);

      const client1 = makeClient();
      const client2 = makeClient();
      const pool1 = createMockPool(client1);
      const pool2 = createMockPool(client2);

      const service1 = createQrService({ db: pool1 });
      const service2 = createQrService({ db: pool2 });

      const result1 = await service1.reissueToken(travelerId, adminId, adminRole);
      const result2 = await service2.reissueToken(travelerId, adminId, adminRole);

      const token1 = (result1 as { new_qr_token_value: string }).new_qr_token_value;
      const token2 = (result2 as { new_qr_token_value: string }).new_qr_token_value;

      expect(token1).not.toBe(token2);
    });
  });
});
