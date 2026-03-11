// =============================================================================
// Password Service Unit Tests
// =============================================================================

import bcrypt from 'bcrypt';

process.env.BCRYPT_SALT_ROUNDS = '4'; // Faster tests

import { hashPassword, comparePassword } from '../../src/services/password.service';

describe('Password Service', () => {
  const plaintext = 'MySecure@Pass1';

  describe('hashPassword()', () => {
    it('should return a bcrypt hash', async () => {
      const hash = await hashPassword(plaintext);
      expect(hash).toBeDefined();
      expect(hash.startsWith('$2b$')).toBe(true);
      expect(hash.length).toBe(60);
    });

    it('should produce different hashes for the same input (unique salts)', async () => {
      const hash1 = await hashPassword(plaintext);
      const hash2 = await hashPassword(plaintext);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword()', () => {
    it('should return true for a matching password', async () => {
      const hash = await hashPassword(plaintext);
      const result = await comparePassword(plaintext, hash);
      expect(result).toBe(true);
    });

    it('should return false for a wrong password', async () => {
      const hash = await hashPassword(plaintext);
      const result = await comparePassword('WrongPassword1!', hash);
      expect(result).toBe(false);
    });

    it('should return false for an empty string', async () => {
      const hash = await hashPassword(plaintext);
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });
  });
});
