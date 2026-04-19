import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

describe('Database migrations', () => {
  it('001_initial_schema.sql is a valid non-empty SQL file', async () => {
    const sql = await readFile(
      join(MIGRATIONS_DIR, '001_initial_schema.sql'),
      'utf-8'
    );
    expect(sql.length).toBeGreaterThan(0);
    expect(sql).toContain('CREATE EXTENSION');
    expect(sql).toContain('CREATE TYPE role_type');
    expect(sql).toContain('CREATE TABLE families');
    expect(sql).toContain('CREATE TABLE travelers');
    expect(sql).toContain('CREATE TABLE qr_tokens');
    expect(sql).toContain('CREATE TABLE magic_links');
    expect(sql).toContain('CREATE TABLE groups');
    expect(sql).toContain('CREATE TABLE traveler_groups');
    expect(sql).toContain('CREATE TABLE hotels');
    expect(sql).toContain('CREATE TABLE traveler_hotels');
    expect(sql).toContain('CREATE TABLE events');
    expect(sql).toContain('CREATE TABLE event_eligibility');
    expect(sql).toContain('CREATE TABLE itinerary_options');
    expect(sql).toContain('CREATE TABLE traveler_options');
    expect(sql).toContain('CREATE TABLE buses');
    expect(sql).toContain('CREATE TABLE bus_assignments');
    expect(sql).toContain('CREATE TABLE flights');
    expect(sql).toContain('CREATE TABLE traveler_flights');
    expect(sql).toContain('CREATE TABLE notifications');
    expect(sql).toContain('CREATE TABLE traveler_notifications');
    expect(sql).toContain('CREATE TABLE scan_logs');
    expect(sql).toContain('CREATE TABLE audit_logs');
  });

  it('includes all required extensions', async () => {
    const sql = await readFile(
      join(MIGRATIONS_DIR, '001_initial_schema.sql'),
      'utf-8'
    );
    expect(sql).toContain('"uuid-ossp"');
    expect(sql).toContain('"pg_trgm"');
    expect(sql).toContain('"pgcrypto"');
  });

  it('includes all required enums', async () => {
    const sql = await readFile(
      join(MIGRATIONS_DIR, '001_initial_schema.sql'),
      'utf-8'
    );
    expect(sql).toContain('CREATE TYPE role_type AS ENUM');
    expect(sql).toContain('CREATE TYPE access_status AS ENUM');
    expect(sql).toContain('CREATE TYPE event_type AS ENUM');
    expect(sql).toContain('CREATE TYPE scan_result AS ENUM');
    expect(sql).toContain('CREATE TYPE notification_target AS ENUM');
  });

  it('includes the deferred FK for families.representative_id', async () => {
    const sql = await readFile(
      join(MIGRATIONS_DIR, '001_initial_schema.sql'),
      'utf-8'
    );
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED');
    expect(sql).toContain('fk_families_representative');
  });

  it('includes the trigram GIN index on full_name_normalized', async () => {
    const sql = await readFile(
      join(MIGRATIONS_DIR, '001_initial_schema.sql'),
      'utf-8'
    );
    expect(sql).toContain('idx_travelers_name_trgm');
    expect(sql).toContain('gin (full_name_normalized gin_trgm_ops)');
  });

  it('includes all required indexes', async () => {
    const sql = await readFile(
      join(MIGRATIONS_DIR, '001_initial_schema.sql'),
      'utf-8'
    );
    const expectedIndexes = [
      'idx_travelers_booking',
      'idx_travelers_family',
      'idx_travelers_email',
      'idx_travelers_name_normalized',
      'idx_travelers_name_trgm',
      'idx_qr_tokens_value',
      'idx_qr_tokens_traveler',
      'idx_magic_links_token',
      'idx_bus_assignments_traveler',
      'idx_scan_logs_staff',
      'idx_scan_logs_token',
      'idx_scan_logs_scanned',
      'idx_audit_logs_action',
      'idx_audit_logs_created',
      'idx_audit_logs_actor',
    ];
    for (const idx of expectedIndexes) {
      expect(sql).toContain(idx);
    }
  });

  it('includes token_hash column for SHA-256 audit in qr_tokens', async () => {
    const sql = await readFile(
      join(MIGRATIONS_DIR, '001_initial_schema.sql'),
      'utf-8'
    );
    expect(sql).toContain('token_hash');
    expect(sql).toContain('SHA-256');
  });
});
