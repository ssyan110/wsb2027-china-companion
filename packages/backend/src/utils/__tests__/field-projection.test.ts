import { describe, it, expect } from 'vitest';
import { projectFieldsByRole } from '../field-projection.js';
import type { MasterListRow } from '@wsb/shared';

/** Minimal valid MasterListRow for testing. */
function makeSampleRow(overrides: Partial<MasterListRow> = {}): MasterListRow {
  return {
    traveler_id: 't-1',
    booking_id: 'B100',
    family_id: 'f-1',
    representative_id: 'r-1',
    guardian_id: 'g-1',
    full_name_raw: 'Jane Doe',
    full_name_normalized: 'jane doe',
    email_primary: 'jane@example.com',
    email_aliases: ['alias@example.com'],
    passport_name: 'JANE DOE',
    phone: '555-123-4567',
    role_type: 'traveler',
    access_status: 'activated',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    groups: ['Group A'],
    hotels: ['Hotel X'],
    flights: [{ flight_number: 'AA100', arrival_time: '2025-06-01T10:00:00Z' }],
    bus_assignments: [{ bus_number: 'B1', event_name: 'Opening' }],
    qr_active: true,
    ...overrides,
  };
}

describe('projectFieldsByRole', () => {
  it('removes email_aliases and guardian_id for admin role', () => {
    const row = makeSampleRow();
    const result = projectFieldsByRole(row, 'admin');

    expect(result).not.toHaveProperty('email_aliases');
    expect(result).not.toHaveProperty('guardian_id');
  });

  it('preserves all other fields for admin role', () => {
    const row = makeSampleRow();
    const result = projectFieldsByRole(row, 'admin');

    expect(result).toHaveProperty('traveler_id', 't-1');
    expect(result).toHaveProperty('email_primary', 'jane@example.com');
    expect(result).toHaveProperty('full_name_raw', 'Jane Doe');
    expect(result).toHaveProperty('groups');
    expect(result).toHaveProperty('qr_active', true);
  });

  it('returns all fields for super_admin role', () => {
    const row = makeSampleRow();
    const result = projectFieldsByRole(row, 'super_admin');

    expect(result).toHaveProperty('email_aliases');
    expect(result).toHaveProperty('guardian_id');
    expect(result).toHaveProperty('traveler_id');
    expect(result).toHaveProperty('email_primary');
  });

  it('handles null email_aliases and guardian_id for super_admin', () => {
    const row = makeSampleRow({ email_aliases: null, guardian_id: null });
    const result = projectFieldsByRole(row, 'super_admin');

    expect(result).toHaveProperty('email_aliases', null);
    expect(result).toHaveProperty('guardian_id', null);
  });

  it('does not mutate the original row', () => {
    const row = makeSampleRow();
    const originalKeys = Object.keys(row);
    projectFieldsByRole(row, 'admin');

    expect(Object.keys(row)).toEqual(originalKeys);
    expect(row).toHaveProperty('email_aliases');
    expect(row).toHaveProperty('guardian_id');
  });
});
