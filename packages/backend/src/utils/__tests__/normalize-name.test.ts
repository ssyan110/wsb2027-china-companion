import { describe, it, expect } from 'vitest';
import { normalizeName } from '../normalize-name.js';

describe('normalizeName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeName('  John Doe  ')).toBe('john doe');
  });

  it('lowercases all characters', () => {
    expect(normalizeName('JOHN DOE')).toBe('john doe');
    expect(normalizeName('John Doe')).toBe('john doe');
  });

  it('strips diacritics from accented characters', () => {
    expect(normalizeName('José García')).toBe('jose garcia');
    expect(normalizeName('François Müller')).toBe('francois muller');
    expect(normalizeName('Ångström Ñoño')).toBe('angstrom nono');
  });

  it('collapses multiple whitespace characters into a single space', () => {
    expect(normalizeName('John   Doe')).toBe('john doe');
    expect(normalizeName('John\t\tDoe')).toBe('john doe');
    expect(normalizeName('  John   Middle   Doe  ')).toBe('john middle doe');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeName('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeName('   ')).toBe('');
  });

  it('returns the same result for already normalized input', () => {
    const normalized = 'jose garcia';
    expect(normalizeName(normalized)).toBe(normalized);
  });
});
