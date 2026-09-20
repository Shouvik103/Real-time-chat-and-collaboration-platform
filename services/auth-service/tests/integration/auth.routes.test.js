// =============================================================================
// Auth Routes Integration Tests — supertest against Express app
// =============================================================================

const request = require('supertest');

// ── Mock Redis ──────────────────────────────────────────────────────────────

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
};

jest.mock('../../src/config/redis', () => ({
  redis: mockRedis,
}));

// ── Mock Prisma ─────────────────────────────────────────────────────────────

const mockPrismaUser = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: mockPrismaUser,
    workspaceMember: { findMany: jest.fn().mockResolvedValue([]) },
  })),
}));

// ── Mock passport (disable OAuth strategies) ────────────────────────────────

jest.mock('../../src/config/passport', () => require('passport'));

// ── Mock OTP Service ────────────────────────────────────────────────────────

const mockOtpService = {
  generateAndSendOtp: jest.fn().mockResolvedValue({ success: true, cooldownSeconds: 60 }),
  verifyOtp: jest.fn().mockImplementation(async (email, otp) => {
    if (otp === '123456') return { valid: true };
    return { valid: false, error: 'Invalid or expired verification code' };
  }),
};

jest.mock('../../src/services/otp.service', () => mockOtpService);

// ── Env vars ────────────────────────────────────────────────────────────────

process.env.JWT_SECRET = 'test-access-secret-key-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes';
process.env.NODE_ENV = 'test';
process.env.BCRYPT_SALT_ROUNDS = '4';

const app = require('../../src/app');
const { signAccessToken, signRefreshToken } = require('../../src/services/jwt.service');

// ── Fixtures ────────────────────────────────────────────────────────────────

const testUser = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  password: '$2b$04$hash.hash.hash.hash.hash.hash.hash.hash.hash.hash.hash.ha', // bcrypt hash
  displayName: 'Test User',
  avatarUrl: null,
  status: 'ACTIVE',
  provider: 'LOCAL',
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ═══════════════════════════════════════════════════════════════════════════

describe('Auth Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /api/auth/send-otp ───────────────────────────────────────────

  describe('POST /api/auth/send-otp', () => {
    it('should send an OTP to a valid unused email', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'new@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/verification code sent/i);
    });

    it('should return 409 if email is already registered', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: testUser.email });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /api/auth/register ───────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    const validBody = {
      email: 'new@example.com',
      password: 'Str0ng@Pass',
      displayName: 'New User',
      otp: '123456',
    };

    it('should register a new user and return tokens when OTP is valid', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue({
        ...testUser,
        id: 'new-user-id',
        email: validBody.email,
        displayName: validBody.displayName,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validBody.email);
    });

    it('should return 400 if OTP is invalid or expired', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validBody, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_OTP');
    });

    it('should return 409 when email already exists', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'bad', password: 'short', displayName: '', otp: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── POST /api/auth/login ──────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Str0ng@Pass', 4);

      mockPrismaUser.findUnique.mockResolvedValue({
        ...testUser,
        password: hashedPassword,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Str0ng@Pass' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for non-existent user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'no@user.com', password: 'Str0ng@Pass' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for wrong password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('CorrectPass1!', 4);

      mockPrismaUser.findUnique.mockResolvedValue({
        ...testUser,
        password: hashedPassword,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1!' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 403 for suspended user', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Str0ng@Pass', 4);

      mockPrismaUser.findUnique.mockResolvedValue({
        ...testUser,
        password: hashedPassword,
        status: 'SUSPENDED',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Str0ng@Pass' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
    });
  });

  // ── POST /api/auth/logout ─────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should logout an authenticated user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(testUser);
      const token = signAccessToken({ userId: testUser.id, email: testUser.email, displayName: testUser.displayName });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled(); // blacklist
      expect(mockRedis.keys).toHaveBeenCalled(); // revoke all refresh
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/auth/refresh ────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should rotate tokens with a valid refresh token', async () => {
      const refreshToken = await signRefreshToken({
        userId: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
      });

      mockRedis.get.mockResolvedValue('valid');
      mockPrismaUser.findUnique.mockResolvedValue(testUser);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 400 when no refresh token provided', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_REFRESH_TOKEN');
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should detect reuse and revoke all tokens', async () => {
      const refreshToken = await signRefreshToken({
        userId: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
      });

      mockRedis.get.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('REFRESH_TOKEN_REUSE');
      expect(mockRedis.keys).toHaveBeenCalledWith(
        expect.stringContaining('refresh:'),
      );
    });
  });

  // ── GET /api/auth/me ──────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return user data for authenticated user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        ...testUser,
        memberships: [],
      });
      const token = signAccessToken({ userId: testUser.id, email: testUser.email, displayName: testUser.displayName });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── Health check ──────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('healthy');
    });
  });

  // ── 404 ───────────────────────────────────────────────────────────────

  describe('Unknown routes', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
