import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16;

/**
 * Derives a 256-bit key from the provided secret using SHA-256.
 * In production, use a proper key management service.
 */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? 'default-dev-key-change-in-production';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string: iv + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv (12) + tag (16) + ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Returns the original plaintext string.
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const packed = Buffer.from(encoded, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
