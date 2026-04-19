import { describe, it, expect } from 'vitest';
import {
  maskEmail,
  maskPhone,
  maskPassportName,
  maskFieldValue,
  applyMasking,
} from '../field-masker.js';
import type { MasterListRow } from '@wsb/shared';

// ─── maskEmail ───────────────────────────────────────────────

describe('maskEmail', () => {
  it('masks a standard email', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
  });

  it('masks a single-char local part', () => {
    expect(maskEmail('j@example.com')).toBe('j***@example.com');
  });

  it('masks a long local part', () => {
    expect(maskEmail('longusername@domain.org')).toBe('l***@domain.org');
  });

  it('returns as-is when no @ present', () => {
    expect(maskEmail('noemail')).toBe('noemail');
  });

  it('returns as-is when @ is the first character', () => {
    expect(maskEmail('@domain.com')).toBe('@domain.com');
  });
});

// ─── maskPhone ───────────────────────────────────────────────

describe('maskPhone', () => {
  it('masks a US-formatted phone number', () => {
    expect(maskPhone('555-867-1234')).toBe('***-***-1234');
  });

  it('masks a plain digit string', () => {
    expect(maskPhone('5558671234')).toBe('******1234');
  });

  it('masks a phone with country code', () => {
    expect(maskPhone('+1-555-867-1234')).toBe('+*-***-***-1234');
  });

  it('returns as-is when 4 or fewer digits', () => {
    expect(maskPhone('1234')).toBe('1234');
    expect(maskPhone('12')).toBe('12');
  });

  it('masks a phone with spaces', () => {
    expect(maskPhone('555 867 1234')).toBe('*** *** 1234');
  });
});

// ─── maskPassportName ────────────────────────────────────────

describe('maskPassportName', () => {
  it('masks a standard name', () => {
    expect(maskPassportName('JOHN E')).toBe('J****E');
  });

  it('masks a single-word name', () => {
    expect(maskPassportName('JOHN')).toBe('J**N');
  });

  it('returns as-is for 2-char name', () => {
    expect(maskPassportName('JE')).toBe('JE');
  });

  it('returns as-is for 1-char name', () => {
    expect(maskPassportName('J')).toBe('J');
  });

  it('returns empty string for empty input', () => {
    expect(maskPassportName('')).toBe('');
  });

  it('masks a long name', () => {
    expect(maskPassportName('ALEXANDER')).toBe('A*******R');
  });
});

// ─── maskFieldValue ──────────────────────────────────────────

describe('maskFieldValue', () => {
  it('dispatches to maskEmail for email type', () => {
    expect(maskFieldValue('test@example.com', 'email')).toBe('t***@example.com');
  });

  it('dispatches to maskPhone for phone type', () => {
    expect(maskFieldValue('555-867-1234', 'phone')).toBe('***-***-1234');
  });

  it('dispatches to maskPassportName for passport_name type', () => {
    expect(maskFieldValue('JOHN DOE', 'passport_name')).toBe('J******E');
  });
});

// ─── applyMasking ────────────────────────────────────────────

const baseRow: MasterListRow = {
  traveler_id: 't1',
  booking_id: 'b1',
  family_id: 'f1',
  representative_id: null,
  full_name_raw: 'John Doe',
  full_name_normalized: 'john doe',
  email_primary: 'john@example.com',
  email_aliases: ['alias@example.com'],
  passport_name: 'JOHN DOE',
  phone: '555-867-1234',
  role_type: 'traveler',
  access_status: 'activated',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  groups: ['Group A'],
  hotels: ['Hotel X'],
  flights: [{ flight_number: 'AA100', arrival_time: '2025-06-01T10:00:00Z' }],
  bus_assignments: [{ bus_number: 'B1', event_name: 'Event 1' }],
  qr_active: true,
};

describe('applyMasking', () => {
  it('returns row unchanged when shouldUnmask is true', () => {
    const result = applyMasking(baseRow, true);
    expect(result).toEqual(baseRow);
  });

  it('masks PII fields when shouldUnmask is false', () => {
    const result = applyMasking(baseRow, false);
    expect(result.email_primary).toBe('j***@example.com');
    expect(result.phone).toBe('***-***-1234');
    expect(result.passport_name).toBe('J******E');
    expect(result.email_aliases).toEqual(['a***@example.com']);
  });

  it('preserves non-PII fields when masking', () => {
    const result = applyMasking(baseRow, false);
    expect(result.traveler_id).toBe(baseRow.traveler_id);
    expect(result.full_name_raw).toBe(baseRow.full_name_raw);
    expect(result.groups).toEqual(baseRow.groups);
    expect(result.qr_active).toBe(baseRow.qr_active);
  });

  it('handles null phone and passport_name', () => {
    const row: MasterListRow = { ...baseRow, phone: null, passport_name: null };
    const result = applyMasking(row, false);
    expect(result.phone).toBeNull();
    expect(result.passport_name).toBeNull();
  });

  it('handles null email_aliases', () => {
    const row: MasterListRow = { ...baseRow, email_aliases: null };
    const result = applyMasking(row, false);
    expect(result.email_aliases).toBeNull();
  });

  it('handles undefined email_aliases', () => {
    const row: MasterListRow = { ...baseRow, email_aliases: undefined };
    const result = applyMasking(row, false);
    expect(result.email_aliases).toBeUndefined();
  });
});
