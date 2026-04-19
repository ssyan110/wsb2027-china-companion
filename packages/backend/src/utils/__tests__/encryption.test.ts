import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../encryption.js';

describe('AES-256-GCM encryption', () => {
  it('encrypts and decrypts a string round-trip', () => {
    const plaintext = 'user@example.com';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertexts for the same input (random IV)', () => {
    const plaintext = '+1-555-0100';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    // Both decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it('handles empty string', () => {
    const ciphertext = encrypt('');
    expect(decrypt(ciphertext)).toBe('');
  });

  it('handles unicode content', () => {
    const plaintext = '用户@例子.中国';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('throws on tampered ciphertext', () => {
    const ciphertext = encrypt('secret');
    const tampered = ciphertext.slice(0, -2) + 'XX';
    expect(() => decrypt(tampered)).toThrow();
  });
});
