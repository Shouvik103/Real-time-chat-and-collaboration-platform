// =============================================================================
// OTP Service Unit Tests
// =============================================================================

const {
  generateAndSendOtp,
  verifyOtp,
  generateSecureCode,
  dispatchEmail,
  OTP_TTL_SECONDS,
  COOLDOWN_SECONDS,
  MAX_ATTEMPTS,
  _clearFallbackStore,
} = require('../../src/services/otp.service');

// Mock Redis
const mockRedisStore = new Map();
const mockTtlStore = new Map();

jest.mock('../../src/config/redis', () => ({
  redis: {
    status: 'ready',
    get: jest.fn(async (key) => mockRedisStore.get(key) || null),
    set: jest.fn(async (key, val, ex, ttl) => {
      mockRedisStore.set(key, val);
      if (ttl) mockTtlStore.set(key, ttl);
      return 'OK';
    }),
    del: jest.fn(async (key) => {
      mockRedisStore.delete(key);
      mockTtlStore.delete(key);
      return 1;
    }),
    ttl: jest.fn(async (key) => (mockTtlStore.has(key) ? mockTtlStore.get(key) : -2)),
  },
}));

describe('OTP Service', () => {
  const testEmail = 'user@example.com';

  beforeEach(() => {
    mockRedisStore.clear();
    mockTtlStore.clear();
    if (_clearFallbackStore) _clearFallbackStore();
    jest.clearAllMocks();
  });

  describe('generateSecureCode', () => {
    it('should generate a 6-digit numeric string', () => {
      const code = generateSecureCode();
      expect(code).toMatch(/^\d{6}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    });
  });

  describe('generateAndSendOtp', () => {
    it('should generate an OTP, store in Redis with 10m TTL, and set cooldown', async () => {
      const res = await generateAndSendOtp(testEmail);
      expect(res.success).toBe(true);
      expect(res.cooldownSeconds).toBe(COOLDOWN_SECONDS);

      const storedOtp = mockRedisStore.get(`otp:${testEmail}`);
      expect(storedOtp).toBeDefined();
      const parsed = JSON.parse(storedOtp);
      expect(parsed.code).toMatch(/^\d{6}$/);
      expect(parsed.attempts).toBe(0);

      // Verify cooldown exists
      expect(mockRedisStore.get(`otp_cooldown:${testEmail}`)).toBe('1');
    });

    it('should enforce cooldown if requested before 60s expires', async () => {
      mockTtlStore.set(`otp_cooldown:${testEmail}`, 45);

      const res = await generateAndSendOtp(testEmail);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/wait 45 seconds/i);
    });
  });

  describe('verifyOtp', () => {
    it('should successfully verify a correct code and clean up Redis', async () => {
      const code = '123456';
      mockRedisStore.set(`otp:${testEmail}`, JSON.stringify({ code, attempts: 0 }));
      mockTtlStore.set(`otp:${testEmail}`, 500);

      const res = await verifyOtp(testEmail, code);
      expect(res.valid).toBe(true);

      // Key should be deleted from Redis
      expect(mockRedisStore.get(`otp:${testEmail}`)).toBeUndefined();
    });

    it('should reject verification if code is expired or not found', async () => {
      const res = await verifyOtp(testEmail, '999999');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/expired|not requested/i);
    });

    it('should decrement remaining attempts on incorrect code', async () => {
      const code = '123456';
      mockRedisStore.set(`otp:${testEmail}`, JSON.stringify({ code, attempts: 0 }));
      mockTtlStore.set(`otp:${testEmail}`, 500);

      const res = await verifyOtp(testEmail, '000000');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/4 attempts remaining/i);

      // Verify attempts updated in Redis
      const updated = JSON.parse(mockRedisStore.get(`otp:${testEmail}`));
      expect(updated.attempts).toBe(1);
    });

    it('should invalidate and destroy OTP after 5 failed attempts (brute force protection)', async () => {
      const code = '123456';
      mockRedisStore.set(`otp:${testEmail}`, JSON.stringify({ code, attempts: 4 }));
      mockTtlStore.set(`otp:${testEmail}`, 500);

      const res = await verifyOtp(testEmail, '000000');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/invalidated|too many/i);

      // Key should now be completely deleted
      expect(mockRedisStore.get(`otp:${testEmail}`)).toBeUndefined();
    });
  });

  describe('dispatchEmail', () => {
    it('should log to console in development mode when SMTP is not configured', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const res = await dispatchEmail(testEmail, '654321');
      expect(res.delivered).toBe(true);
      expect(res.provider).toBe('console');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
