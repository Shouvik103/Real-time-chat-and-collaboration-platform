// =============================================================================
// User Routes Integration Tests — supertest against Express app
// =============================================================================

import request from 'supertest';

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
  update: jest.fn(),
};

const mockPrismaWorkspaceMember = {
  findMany: jest.fn().mockResolvedValue([]),
  findUnique: jest.fn(),
};

const mockPrismaWorkspace = {
  create: jest.fn(),
};

const mockPrismaChannel = {
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: mockPrismaUser,
    workspaceMember: mockPrismaWorkspaceMember,
    workspace: mockPrismaWorkspace,
    channel: mockPrismaChannel,
  })),
}));

// ── Mock passport (disable OAuth strategies) ────────────────────────────────

jest.mock('../../src/config/passport', () => {
  const passport = require('passport');
  return {
    __esModule: true,
    default: passport,
  };
});

// ── Env vars ────────────────────────────────────────────────────────────────

process.env.JWT_SECRET = 'test-access-secret-key-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes';
process.env.NODE_ENV = 'test';

import app from '../../src/app';
import { signAccessToken } from '../../src/services/jwt.service';

// ── Fixtures ────────────────────────────────────────────────────────────────

const testUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  password: '$2b$04$hashhash',
  displayName: 'Test User',
  avatarUrl: null,
  status: 'ACTIVE',
  provider: 'LOCAL',
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VALID_WORKSPACE_ID = '660e8400-e29b-41d4-a716-446655440001';
const VALID_UUID = '770e8400-e29b-41d4-a716-446655440002';

const getAuthHeader = () => {
  const token = signAccessToken({ userId: testUser.id, email: testUser.email, displayName: testUser.displayName });
  return `Bearer ${token}`;
};

// ═══════════════════════════════════════════════════════════════════════════

describe('User Routes', () => {
  beforeEach(() => {
    // Reset all mock implementations for a clean slate
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.keys.mockResolvedValue([]);
    // Default: authenticate middleware finds the user
    mockPrismaUser.findUnique.mockResolvedValue(testUser);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── GET /api/users/profile/:userId ────────────────────────────────────

  describe('GET /api/users/profile/:userId', () => {
    it('should return the user profile', async () => {
      const res = await request(app)
        .get(`/api/users/profile/${testUser.id}`)
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 404 when user not found', async () => {
      // First call: authenticate finds the user; Second call: getProfile doesn't
      mockPrismaUser.findUnique
        .mockResolvedValueOnce(testUser)  // authenticate
        .mockResolvedValueOnce(null);     // getProfile

      const res = await request(app)
        .get(`/api/users/profile/${VALID_UUID}`)
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get(`/api/users/profile/${testUser.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/users/profile ──────────────────────────────────────────

  describe('PATCH /api/users/profile', () => {
    it('should update the display name', async () => {
      mockPrismaUser.update.mockResolvedValue({
        ...testUser,
        displayName: 'Updated Name',
      });

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', getAuthHeader())
        .send({ displayName: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.displayName).toBe('Updated Name');
    });

    it('should return 400 when no fields are provided', async () => {
      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', getAuthHeader())
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/users/workspaces ─────────────────────────────────────────

  describe('GET /api/users/workspaces', () => {
    it('should return user workspaces', async () => {
      mockPrismaWorkspaceMember.findMany.mockResolvedValue([
        {
          workspace: { id: 'ws-1', name: 'My Workspace', slug: 'my-workspace' },
        },
      ]);

      const res = await request(app)
        .get('/api/users/workspaces')
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.workspaces).toHaveLength(1);
    });
  });

  // ── POST /api/users/workspaces ────────────────────────────────────────

  describe('POST /api/users/workspaces', () => {
    it('should create a new workspace', async () => {
      mockPrismaWorkspace.create.mockResolvedValue({
        id: 'ws-new',
        name: 'New Workspace',
        slug: 'new-workspace-abc',
        ownerId: testUser.id,
      });

      const res = await request(app)
        .post('/api/users/workspaces')
        .set('Authorization', getAuthHeader())
        .send({ name: 'New Workspace' });

      expect(res.status).toBe(201);
      expect(res.body.data.workspace.name).toBe('New Workspace');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/users/workspaces')
        .set('Authorization', getAuthHeader())
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/users/workspaces/:workspaceId/channels ───────────────────

  describe('GET /api/users/workspaces/:workspaceId/channels', () => {
    it('should return channels for a workspace member', async () => {
      mockPrismaWorkspaceMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
      mockPrismaChannel.findMany.mockResolvedValue([
        { id: 'ch-1', name: 'general', type: 'PUBLIC' },
      ]);

      const res = await request(app)
        .get(`/api/users/workspaces/${VALID_WORKSPACE_ID}/channels`)
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.channels).toHaveLength(1);
    });

    it('should return 403 for non-member', async () => {
      mockPrismaWorkspaceMember.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/users/workspaces/${VALID_WORKSPACE_ID}/channels`)
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/users/workspaces/:workspaceId/channels ──────────────────

  describe('POST /api/users/workspaces/:workspaceId/channels', () => {
    it('should create a channel', async () => {
      mockPrismaWorkspaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
      mockPrismaChannel.create.mockResolvedValue({
        id: 'ch-new',
        name: 'random',
        type: 'PUBLIC',
        workspaceId: 'ws-uuid',
      });

      const res = await request(app)
        .post(`/api/users/workspaces/${VALID_WORKSPACE_ID}/channels`)
        .set('Authorization', getAuthHeader())
        .send({ name: 'random' });

      expect(res.status).toBe(201);
      expect(res.body.data.channel.name).toBe('random');
    });

    it('should return 403 for non-member', async () => {
      mockPrismaWorkspaceMember.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/users/workspaces/${VALID_WORKSPACE_ID}/channels`)
        .set('Authorization', getAuthHeader())
        .send({ name: 'random' });

      expect(res.status).toBe(403);
    });
  });
});
