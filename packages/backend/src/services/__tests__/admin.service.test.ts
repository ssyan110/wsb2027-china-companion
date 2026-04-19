import { describe, it, expect, vi } from 'vitest';
import {
  validateCsvRow,
  parseCsvRow,
  createAdminService,
} from '../admin.service.js';
import type { CsvRowInput, Actor } from '../admin.service.js';

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
  } as unknown as import('pg').Pool & { _client: typeof mockClient };
}

// ─── validateCsvRow ──────────────────────────────────────────

describe('validateCsvRow', () => {
  it('should return no errors for a valid row', () => {
    const row: CsvRowInput = {
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      role_type: 'traveler',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors).toEqual([]);
  });

  it('should return error when full_name is missing', () => {
    const row: CsvRowInput = {
      email: 'jane@example.com',
      role_type: 'traveler',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors).toEqual([
      { row: 1, field: 'full_name', reason: 'full_name is required' },
    ]);
  });

  it('should return error when full_name is empty string', () => {
    const row: CsvRowInput = {
      full_name: '   ',
      email: 'jane@example.com',
      role_type: 'traveler',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors).toEqual([
      { row: 1, field: 'full_name', reason: 'full_name is required' },
    ]);
  });

  it('should return error when email is missing', () => {
    const row: CsvRowInput = {
      full_name: 'Jane Doe',
      role_type: 'traveler',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors).toEqual([
      { row: 1, field: 'email', reason: 'email is required' },
    ]);
  });

  it('should return error for invalid email format', () => {
    const row: CsvRowInput = {
      full_name: 'Jane Doe',
      email: 'not-an-email',
      role_type: 'traveler',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors).toEqual([
      { row: 1, field: 'email', reason: 'invalid email format' },
    ]);
  });

  it('should return error when role_type is missing', () => {
    const row: CsvRowInput = {
      full_name: 'Jane Doe',
      email: 'jane@example.com',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors).toEqual([
      { row: 1, field: 'role_type', reason: 'role_type is required' },
    ]);
  });

  it('should return error for invalid role_type', () => {
    const row: CsvRowInput = {
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      role_type: 'invalid_role',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors.length).toBe(1);
    expect(errors[0].field).toBe('role_type');
    expect(errors[0].reason).toContain('role_type must be one of');
  });

  it('should return error when minor has no guardian_id', () => {
    const row: CsvRowInput = {
      full_name: 'Child Doe',
      email: 'child@example.com',
      role_type: 'minor',
    };
    const errors = validateCsvRow(row, 2);
    expect(errors).toEqual([
      { row: 2, field: 'guardian_id', reason: 'guardian_id is required for minors' },
    ]);
  });

  it('should accept minor with guardian_id', () => {
    const row: CsvRowInput = {
      full_name: 'Child Doe',
      email: 'child@example.com',
      role_type: 'minor',
      guardian_id: 'some-uuid',
    };
    const errors = validateCsvRow(row, 1);
    expect(errors).toEqual([]);
  });

  it('should collect multiple errors for a single row', () => {
    const row: CsvRowInput = {};
    const errors = validateCsvRow(row, 3);
    expect(errors.length).toBe(3);
    expect(errors.map(e => e.field)).toEqual(['full_name', 'email', 'role_type']);
  });

  it('should accept all valid role_types', () => {
    const roles = ['traveler', 'minor', 'representative', 'staff', 'staff_desk', 'admin', 'super_admin'];
    for (const role of roles) {
      const row: CsvRowInput = {
        full_name: 'Test User',
        email: 'test@example.com',
        role_type: role,
        ...(role === 'minor' ? { guardian_id: 'gid-1' } : {}),
      };
      const errors = validateCsvRow(row, 1);
      expect(errors).toEqual([]);
    }
  });
});

// ─── parseCsvRow ─────────────────────────────────────────────

describe('parseCsvRow', () => {
  it('should generate normalized_name, qr_token, and token_hash', () => {
    const row: CsvRowInput = {
      full_name: '  José García  ',
      email: ' JOSE@Example.COM ',
      role_type: 'traveler',
      booking_id: 'BK-001',
    };
    const result = parseCsvRow(row);

    expect(result.full_name).toBe('José García');
    expect(result.email).toBe('jose@example.com');
    expect(result.role_type).toBe('traveler');
    expect(result.booking_id).toBe('BK-001');
    expect(result.guardian_id).toBeNull();
    expect(result.normalized_name).toBe('jose garcia');
    expect(result.qr_token).toBeTruthy();
    expect(result.qr_token.length).toBeGreaterThan(0);
    expect(result.token_hash).toBeTruthy();
    expect(result.token_hash.length).toBe(64); // SHA-256 hex
  });

  it('should generate unique QR tokens for different calls', () => {
    const row: CsvRowInput = {
      full_name: 'Test User',
      email: 'test@example.com',
      role_type: 'traveler',
    };
    const result1 = parseCsvRow(row);
    const result2 = parseCsvRow(row);
    expect(result1.qr_token).not.toBe(result2.qr_token);
    expect(result1.token_hash).not.toBe(result2.token_hash);
  });

  it('should handle missing optional fields', () => {
    const row: CsvRowInput = {
      full_name: 'Test',
      email: 'test@test.com',
      role_type: 'staff',
    };
    const result = parseCsvRow(row);
    expect(result.booking_id).toBeNull();
    expect(result.guardian_id).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.passport_name).toBeNull();
  });

  it('should trim whitespace from all fields', () => {
    const row: CsvRowInput = {
      full_name: '  Alice  ',
      email: '  alice@test.com  ',
      role_type: '  traveler  ',
      booking_id: '  BK-1  ',
      guardian_id: '  gid-1  ',
      phone: '  +1234  ',
      passport_name: '  ALICE  ',
    };
    const result = parseCsvRow(row);
    expect(result.full_name).toBe('Alice');
    expect(result.email).toBe('alice@test.com');
    expect(result.role_type).toBe('traveler');
    expect(result.booking_id).toBe('BK-1');
    expect(result.guardian_id).toBe('gid-1');
    expect(result.phone).toBe('+1234');
    expect(result.passport_name).toBe('ALICE');
  });
});

// ─── AdminService CRUD ───────────────────────────────────────

describe('AdminService', () => {
  describe('listTravelers', () => {
    it('should return all travelers', async () => {
      const db = createMockDb([
        {
          rows: [
            {
              traveler_id: 'tid-1',
              booking_id: 'BK-1',
              family_id: null,
              guardian_id: null,
              full_name_raw: 'Jane Doe',
              full_name_normalized: 'jane doe',
              email_primary: 'jane@example.com',
              role_type: 'traveler',
              access_status: 'activated',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
            },
          ],
        },
      ]);

      const service = createAdminService({ db });
      const result = await service.listTravelers();

      expect(result).toHaveLength(1);
      expect(result[0].traveler_id).toBe('tid-1');
      expect(result[0].full_name_raw).toBe('Jane Doe');
    });
  });

  describe('getTravelerById', () => {
    it('should return traveler when found', async () => {
      const db = createMockDb([
        {
          rows: [{
            traveler_id: 'tid-1',
            booking_id: null,
            family_id: null,
            guardian_id: null,
            full_name_raw: 'Jane Doe',
            full_name_normalized: 'jane doe',
            email_primary: 'jane@example.com',
            role_type: 'traveler',
            access_status: 'activated',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          }],
        },
      ]);

      const service = createAdminService({ db });
      const result = await service.getTravelerById('tid-1');

      expect(result).not.toHaveProperty('error');
      expect((result as { traveler_id: string }).traveler_id).toBe('tid-1');
    });

    it('should return not_found when traveler does not exist', async () => {
      const db = createMockDb([{ rows: [] }]);
      const service = createAdminService({ db });
      const result = await service.getTravelerById('nonexistent');

      expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
    });
  });

  describe('createTraveler', () => {
    it('should create a traveler and QR token in a transaction', async () => {
      const travelerRow = {
        traveler_id: 'new-tid',
        booking_id: null,
        family_id: null,
        guardian_id: null,
        full_name_raw: 'New User',
        full_name_normalized: 'new user',
        email_primary: 'new@example.com',
        role_type: 'traveler',
        access_status: 'invited',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      // Mock client queries: BEGIN, INSERT traveler, INSERT qr_token, COMMIT
      const db = createMockDb([
        { rows: [] }, // BEGIN
        { rows: [travelerRow] }, // INSERT traveler
        { rows: [] }, // INSERT qr_token
        { rows: [] }, // COMMIT
      ]);

      const service = createAdminService({ db });
      const result = await service.createTraveler({
        full_name: 'New User',
        email: 'new@example.com',
        role_type: 'traveler',
      });

      expect(result).not.toHaveProperty('error');
      expect((result as { traveler_id: string }).traveler_id).toBe('new-tid');
    });
  });

  describe('deactivateTraveler', () => {
    it('should deactivate traveler and revoke QR tokens', async () => {
      const db = createMockDb([
        { rows: [{ traveler_id: 'tid-1' }] }, // UPDATE travelers
        { rows: [] }, // UPDATE qr_tokens
      ]);

      const service = createAdminService({ db });
      const result = await service.deactivateTraveler('tid-1');

      expect(result).toEqual({ success: true });
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should return not_found when traveler does not exist', async () => {
      const db = createMockDb([{ rows: [] }]);
      const service = createAdminService({ db });
      const result = await service.deactivateTraveler('nonexistent');

      expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
    });
  });

  describe('importTravelersCsv', () => {
    it('should parse valid CSV and return import count', async () => {
      const csv = `full_name,email,role_type,booking_id
Jane Doe,jane@example.com,traveler,BK-001
John Smith,john@example.com,staff,BK-002`;

      const travelerRow1 = { traveler_id: 'tid-1' };
      const travelerRow2 = { traveler_id: 'tid-2' };

      // Mock client queries: BEGIN, INSERT t1, INSERT qr1, INSERT t2, INSERT qr2, COMMIT
      const db = createMockDb([
        { rows: [] }, // BEGIN
        { rows: [travelerRow1] }, // INSERT traveler 1
        { rows: [] }, // INSERT qr_token 1
        { rows: [travelerRow2] }, // INSERT traveler 2
        { rows: [] }, // INSERT qr_token 2
        { rows: [] }, // COMMIT
      ]);

      const service = createAdminService({ db });
      const result = await service.importTravelersCsv(csv);

      expect(result.imported).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('should collect row-level errors without aborting', async () => {
      const csv = `full_name,email,role_type
,invalid-email,bad_role
Valid User,valid@example.com,traveler`;

      const travelerRow = { traveler_id: 'tid-1' };

      // Mock client queries for the one valid row
      const db = createMockDb([
        { rows: [] }, // BEGIN
        { rows: [travelerRow] }, // INSERT traveler
        { rows: [] }, // INSERT qr_token
        { rows: [] }, // COMMIT
      ]);

      const service = createAdminService({ db });
      const result = await service.importTravelersCsv(csv);

      expect(result.imported).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      // Row 1 should have errors for full_name, email format, and role_type
      const row1Errors = result.errors.filter(e => e.row === 1);
      expect(row1Errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should return zero imported for empty CSV', async () => {
      const csv = `full_name,email,role_type`;

      const db = createMockDb([]);
      const service = createAdminService({ db });
      const result = await service.importTravelersCsv(csv);

      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should validate guardian_id for minors in CSV', async () => {
      const csv = `full_name,email,role_type,guardian_id
Child One,child@example.com,minor,`;

      const db = createMockDb([]);
      const service = createAdminService({ db });
      const result = await service.importTravelersCsv(csv);

      expect(result.imported).toBe(0);
      const guardianErrors = result.errors.filter(e => e.field === 'guardian_id');
      expect(guardianErrors.length).toBe(1);
      expect(guardianErrors[0].reason).toContain('guardian_id is required for minors');
    });
  });

  describe('updateTraveler', () => {
    const baseTravelerRow = {
      traveler_id: 'tid-1',
      booking_id: 'BK-1',
      family_id: null,
      guardian_id: null,
      full_name_raw: 'Jane Doe',
      full_name_normalized: 'jane doe',
      email_primary: 'jane@example.com',
      role_type: 'traveler',
      access_status: 'activated',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      first_name: 'Jane',
      last_name: 'Doe',
      gender: 'female',
      age: 30,
      checkin_status: 'pending',
      dietary_vegan: false,
      onsite_flight_change: false,
      jba_repeat: false,
    };

    const actor: Actor = { id: 'admin-1', role: 'admin' };

    it('should update a field and return updated traveler', async () => {
      const updatedRow = { ...baseTravelerRow, first_name: 'Janet' };
      // Transaction flow: BEGIN, SELECT FOR UPDATE, UPDATE, audit INSERT, COMMIT
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [updatedRow] },          // UPDATE RETURNING
        { rows: [] },                    // INSERT audit_logs
        { rows: [] },                    // COMMIT
      ]);

      const service = createAdminService({ db });
      const result = await service.updateTraveler('tid-1', { first_name: 'Janet' }, actor);

      expect(result).not.toHaveProperty('error');
      expect((result as { full_name_raw: string }).full_name_raw).toBe('Jane Doe');
    });

    it('should return not_found when traveler does not exist', async () => {
      // Transaction flow: BEGIN, SELECT FOR UPDATE (empty), ROLLBACK
      const db = createMockDb([
        { rows: [] },  // BEGIN
        { rows: [] },  // SELECT FOR UPDATE — not found
        { rows: [] },  // ROLLBACK
      ]);

      const service = createAdminService({ db });
      const result = await service.updateTraveler('nonexistent', { first_name: 'Test' }, actor);

      expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
    });

    it('should return current traveler when no fields provided', async () => {
      const db = createMockDb([
        { rows: [baseTravelerRow] },  // getTravelerById SELECT
      ]);

      const service = createAdminService({ db });
      const result = await service.updateTraveler('tid-1', {});

      expect(result).not.toHaveProperty('error');
      expect((result as { traveler_id: string }).traveler_id).toBe('tid-1');
    });

    it('should use traveler.checkin_update action_type for checkin_status changes', async () => {
      const updatedRow = { ...baseTravelerRow, checkin_status: 'checked_in' };
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [updatedRow] },          // UPDATE RETURNING
        { rows: [] },                    // INSERT audit_logs (checkin_update)
        { rows: [] },                    // COMMIT
      ]);

      const service = createAdminService({ db });
      await service.updateTraveler('tid-1', { checkin_status: 'checked_in' }, actor);

      // Verify the audit INSERT was called with correct action_type
      const clientCalls = db._client.query.mock.calls;
      const auditCall = clientCalls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![1]).toEqual([
        'admin-1',
        'admin',
        'traveler.checkin_update',
        'traveler',
        'tid-1',
        { field: 'checkin_status', previous_value: 'pending', new_value: 'checked_in' },
      ]);
    });

    it('should use traveler.field_update action_type for non-checkin field changes', async () => {
      const updatedRow = { ...baseTravelerRow, first_name: 'Janet' };
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [updatedRow] },          // UPDATE RETURNING
        { rows: [] },                    // INSERT audit_logs (field_update)
        { rows: [] },                    // COMMIT
      ]);

      const service = createAdminService({ db });
      await service.updateTraveler('tid-1', { first_name: 'Janet' }, actor);

      const clientCalls = db._client.query.mock.calls;
      const auditCall = clientCalls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![1]).toEqual([
        'admin-1',
        'admin',
        'traveler.field_update',
        'traveler',
        'tid-1',
        { field: 'first_name', previous_value: 'Jane', new_value: 'Janet' },
      ]);
    });

    it('should not log audit entry when value has not changed', async () => {
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [baseTravelerRow] },     // UPDATE RETURNING
        { rows: [] },                    // COMMIT
      ]);

      const service = createAdminService({ db });
      await service.updateTraveler('tid-1', { first_name: 'Jane' }, actor);

      const clientCalls = db._client.query.mock.calls;
      const auditCalls = clientCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
      );
      expect(auditCalls).toHaveLength(0);
    });

    it('should rollback transaction on error', async () => {
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
      ]);
      // Make the UPDATE throw an error
      let callCount = 0;
      db._client.query.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ rows: [] }); // BEGIN
        if (callCount === 2) return Promise.resolve({ rows: [baseTravelerRow] }); // SELECT
        if (callCount === 3) return Promise.reject(new Error('DB error')); // UPDATE fails
        return Promise.resolve({ rows: [] }); // ROLLBACK
      });

      const service = createAdminService({ db });
      await expect(service.updateTraveler('tid-1', { first_name: 'Test' }, actor)).rejects.toThrow('DB error');

      // Verify ROLLBACK was called
      const clientCalls = db._client.query.mock.calls;
      const rollbackCall = clientCalls.find(
        (call: unknown[]) => call[0] === 'ROLLBACK',
      );
      expect(rollbackCall).toBeDefined();
    });

    it('should handle multiple field updates with audit entries', async () => {
      const updatedRow = { ...baseTravelerRow, first_name: 'Janet', age: 31 };
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [updatedRow] },          // UPDATE RETURNING
        { rows: [] },                    // INSERT audit_logs (first_name)
        { rows: [] },                    // INSERT audit_logs (age)
        { rows: [] },                    // COMMIT
      ]);

      const service = createAdminService({ db });
      await service.updateTraveler('tid-1', { first_name: 'Janet', age: 31 }, actor);

      const clientCalls = db._client.query.mock.calls;
      const auditCalls = clientCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
      );
      expect(auditCalls).toHaveLength(2);
    });

    it('should work without actor (no audit logging)', async () => {
      const updatedRow = { ...baseTravelerRow, first_name: 'Janet' };
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [updatedRow] },          // UPDATE RETURNING
        { rows: [] },                    // COMMIT
      ]);

      const service = createAdminService({ db });
      const result = await service.updateTraveler('tid-1', { first_name: 'Janet' });

      expect(result).not.toHaveProperty('error');
      // No audit INSERT should have been called
      const clientCalls = db._client.query.mock.calls;
      const auditCalls = clientCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
      );
      expect(auditCalls).toHaveLength(0);
    });

    it('should handle new 002-schema boolean fields', async () => {
      const updatedRow = { ...baseTravelerRow, dietary_vegan: true };
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [updatedRow] },          // UPDATE RETURNING
        { rows: [] },                    // INSERT audit_logs
        { rows: [] },                    // COMMIT
      ]);

      const service = createAdminService({ db });
      await service.updateTraveler('tid-1', { dietary_vegan: true }, actor);

      const clientCalls = db._client.query.mock.calls;
      const auditCall = clientCalls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![1][5]).toEqual({
        field: 'dietary_vegan',
        previous_value: false,
        new_value: true,
      });
    });

    it('should normalize email to lowercase for comparison', async () => {
      const updatedRow = { ...baseTravelerRow, email_primary: 'jane@example.com' };
      const db = createMockDb([
        { rows: [] },                    // BEGIN
        { rows: [baseTravelerRow] },     // SELECT FOR UPDATE
        { rows: [updatedRow] },          // UPDATE RETURNING
        { rows: [] },                    // COMMIT (no audit since email unchanged)
      ]);

      const service = createAdminService({ db });
      await service.updateTraveler('tid-1', { email: 'JANE@EXAMPLE.COM' }, actor);

      // Email should not produce an audit entry since lowercase matches
      const clientCalls = db._client.query.mock.calls;
      const auditCalls = clientCalls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO audit_logs'),
      );
      expect(auditCalls).toHaveLength(0);
    });
  });
});
