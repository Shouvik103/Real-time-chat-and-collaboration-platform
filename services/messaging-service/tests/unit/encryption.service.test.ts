// =============================================================================
// Encryption Service Unit Tests — Mock gRPC client
// =============================================================================

// ── Mock gRPC and proto-loader ──────────────────────────────────────────────

const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();

jest.mock('@grpc/grpc-js', () => ({
  credentials: {
    createInsecure: jest.fn(),
  },
  loadPackageDefinition: jest.fn().mockReturnValue({
    encryption: {
      EncryptionService: jest.fn().mockImplementation(() => ({
        Encrypt: mockEncrypt,
        Decrypt: mockDecrypt,
      })),
    },
  }),
}));

jest.mock('@grpc/proto-loader', () => ({
  loadSync: jest.fn().mockReturnValue({}),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { encrypt, decrypt } from '../../src/services/encryption.service';

// ═══════════════════════════════════════════════════════════════════════════

describe('Encryption Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── encrypt ───────────────────────────────────────────────────────────

  describe('encrypt()', () => {
    it('should return encrypted JSON envelope from gRPC', async () => {
      const mockResponse = {
        ciphertext: 'encrypted-data',
        iv: 'init-vector',
        auth_tag: 'auth-tag-value',
      };
      mockEncrypt.mockImplementation((_req: any, cb: Function) => {
        cb(null, mockResponse);
      });

      const result = await encrypt('Hello, World!');
      const parsed = JSON.parse(result);

      expect(parsed.ciphertext).toBe('encrypted-data');
      expect(parsed.iv).toBe('init-vector');
      expect(parsed.auth_tag).toBe('auth-tag-value');
    });

    it('should reject when gRPC returns an error', async () => {
      mockEncrypt.mockImplementation((_req: any, cb: Function) => {
        cb(new Error('gRPC failure'), null);
      });

      await expect(encrypt('test')).rejects.toThrow('gRPC failure');
    });
  });

  // ── decrypt ───────────────────────────────────────────────────────────

  describe('decrypt()', () => {
    it('should decrypt a JSON envelope via gRPC', async () => {
      mockDecrypt.mockImplementation((_req: any, cb: Function) => {
        cb(null, { plaintext: 'Hello, World!' });
      });

      const stored = JSON.stringify({
        ciphertext: 'encrypted-data',
        iv: 'init-vector',
        auth_tag: 'auth-tag-value',
      });

      const result = await decrypt(stored);
      expect(result).toBe('Hello, World!');
    });

    it('should return raw string if not valid JSON', async () => {
      const result = await decrypt('plain text message');
      expect(result).toBe('plain text message');
    });

    it('should return raw string if JSON lacks encryption fields', async () => {
      const result = await decrypt(JSON.stringify({ foo: 'bar' }));
      expect(result).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('should reject when gRPC returns an error', async () => {
      mockDecrypt.mockImplementation((_req: any, cb: Function) => {
        cb(new Error('Decrypt failure'), null);
      });

      const stored = JSON.stringify({
        ciphertext: 'data',
        iv: 'iv',
        auth_tag: 'tag',
      });

      await expect(decrypt(stored)).rejects.toThrow('Decrypt failure');
    });
  });
});
