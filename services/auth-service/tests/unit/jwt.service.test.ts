// =============================================================================
// JWT Service Unit Tests
// =============================================================================

import jwt from 'jsonwebtoken';

// ── Mock Redis before importing jwt.service ─────────────────────────────────

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
};

jest.mock('../../src/config/redis', () => ({
  redis: mockRedis,
}));

// Set env vars before importing the service
process.env.JWT_SECRET = 'test-access-secret-key-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes';

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistAccessToken,
  isAccessTokenBlacklisted,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  TokenPayload,
} from '../../src/services/jwt.service';

// ── Test Data ───────────────────────────────────────────────────────────────

const testPayload: TokenPayload = {
  userId: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

// ═══════════════════════════════════════════════════════════════════════════

describe('JWT Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── signAccessToken ─────────────────────────────────────────────────────

  describe('signAccessToken()', () => {
    it('should return a valid JWT string', () => {
      const token = signAccessToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should contain the correct payload', () => {
      const token = signAccessToken(testPayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('should include a unique jti', () => {
      const token1 = signAccessToken(testPayload);
      const token2 = signAccessToken(testPayload);
      const d1 = jwt.decode(token1) as Record<string, unknown>;
      const d2 = jwt.decode(token2) as Record<string, unknown>;
      expect(d1.jti).toBeDefined();
      expect(d2.jti).toBeDefined();
      expect(d1.jti).not.toBe(d2.jti);
    });

    it('should set expiry to 15 minutes', () => {
      const token = signAccessToken(testPayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;
      const exp = decoded.exp as number;
      const iat = decoded.iat as number;
      expect(exp - iat).toBe(15 * 60);
    });
  });

  // ── signRefreshToken ────────────────────────────────────────────────────

  describe('signRefreshToken()', () => {
    it('should return a valid JWT string', async () => {
      const token = await signRefreshToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should store the token in Redis', async () => {
      await signRefreshToken(testPayload);
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      const callArgs = mockRedis.set.mock.calls[0];
      expect(callArgs[0]).toMatch(/^refresh:user-123:/);
      expect(callArgs[1]).toBe('valid');
      expect(callArgs[2]).toBe('EX');
      expect(callArgs[3]).toBe(7 * 24 * 60 * 60);
    });

    it('should set expiry to 7 days', async () => {
      const token = await signRefreshToken(testPayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;
      const exp = decoded.exp as number;
      const iat = decoded.iat as number;
      expect(exp - iat).toBe(7 * 24 * 60 * 60);
    });
  });

  // ── verifyAccessToken ───────────────────────────────────────────────────

  describe('verifyAccessToken()', () => {
    it('should verify and return decoded payload', () => {
      const token = signAccessToken(testPayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.jti).toBeDefined();
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw on token signed with wrong secret', () => {
      const badToken = jwt.sign(testPayload, 'wrong-secret');
      expect(() => verifyAccessToken(badToken)).toThrow();
    });
  });

  // ── verifyRefreshToken ──────────────────────────────────────────────────

  describe('verifyRefreshToken()', () => {
    it('should verify a valid refresh token', async () => {
      const token = await signRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyRefreshToken('bad-token')).toThrow();
    });

    it('should throw when using an access token as refresh', () => {
      const accessToken = signAccessToken(testPayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  // ── blacklistAccessToken ────────────────────────────────────────────────

  describe('blacklistAccessToken()', () => {
    it('should store the jti in Redis blacklist', async () => {
      await blacklistAccessToken('jti-abc');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'blacklist:jti-abc',
        'revoked',
        'EX',
        15 * 60,
      );
    });

    it('should accept a custom TTL', async () => {
      await blacklistAccessToken('jti-abc', 300);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'blacklist:jti-abc',
        'revoked',
        'EX',
        300,
      );
    });
  });

  // ── isAccessTokenBlacklisted ────────────────────────────────────────────

  describe('isAccessTokenBlacklisted()', () => {
    it('should return false when token is not blacklisted', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await isAccessTokenBlacklisted('jti-abc');
      expect(result).toBe(false);
    });

    it('should return true when token is blacklisted', async () => {
      mockRedis.get.mockResolvedValue('revoked');
      const result = await isAccessTokenBlacklisted('jti-abc');
      expect(result).toBe(true);
    });
  });

  // ── isRefreshTokenValid ─────────────────────────────────────────────────

  describe('isRefreshTokenValid()', () => {
    it('should return true when token exists as valid in Redis', async () => {
      mockRedis.get.mockResolvedValue('valid');
      const result = await isRefreshTokenValid('user-123', 'jti-abc');
      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith('refresh:user-123:jti-abc');
    });

    it('should return false when token does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await isRefreshTokenValid('user-123', 'jti-abc');
      expect(result).toBe(false);
    });
  });

  // ── revokeRefreshToken ──────────────────────────────────────────────────

  describe('revokeRefreshToken()', () => {
    it('should delete the refresh token from Redis', async () => {
      await revokeRefreshToken('user-123', 'jti-abc');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-123:jti-abc');
    });
  });

  // ── revokeAllRefreshTokens ──────────────────────────────────────────────

  describe('revokeAllRefreshTokens()', () => {
    it('should delete all refresh tokens for a user', async () => {
      mockRedis.keys.mockResolvedValue([
        'refresh:user-123:jti-1',
        'refresh:user-123:jti-2',
      ]);
      await revokeAllRefreshTokens('user-123');
      expect(mockRedis.keys).toHaveBeenCalledWith('refresh:user-123:*');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'refresh:user-123:jti-1',
        'refresh:user-123:jti-2',
      );
    });

    it('should not call del when no tokens exist', async () => {
      mockRedis.keys.mockResolvedValue([]);
      await revokeAllRefreshTokens('user-123');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
