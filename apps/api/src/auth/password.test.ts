import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password helpers', () => {
  it('hashes a password to a different string', async () => {
    const hash = await hashPassword('mysecret');
    expect(hash).not.toBe('mysecret');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const hash1 = await hashPassword('mysecret');
    const hash2 = await hashPassword('mysecret');
    expect(hash1).not.toBe(hash2);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('mysecret');
    const result = await verifyPassword('mysecret', hash);
    expect(result).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('mysecret');
    const result = await verifyPassword('wrongpassword', hash);
    expect(result).toBe(false);
  });
});
