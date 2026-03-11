// =============================================================================
// Message Routes Integration Tests — supertest
// =============================================================================

import request from 'supertest';

// ── Mock message service ────────────────────────────────────────────────────

jest.mock('../../src/services/message.service', () => ({
  getChannelMessages: jest.fn(),
}));

import app from '../../src/app';
import * as messageService from '../../src/services/message.service';

const mockGetChannelMessages = messageService.getChannelMessages as jest.MockedFunction<
  typeof messageService.getChannelMessages
>;

// ═══════════════════════════════════════════════════════════════════════════

describe('Message Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/messages/:channelId ──────────────────────────────────────

  describe('GET /api/messages/:channelId', () => {
    it('should return paginated messages', async () => {
      mockGetChannelMessages.mockResolvedValue({
        messages: [
          { _id: 'msg-1', content: 'Hello', channelId: 'ch-1' } as any,
          { _id: 'msg-2', content: 'World', channelId: 'ch-1' } as any,
        ],
        nextCursor: null,
      });

      const res = await request(app).get('/api/messages/ch-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toHaveLength(2);
      expect(res.body.data.nextCursor).toBeNull();
    });

    it('should pass cursor and limit query params', async () => {
      mockGetChannelMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
      });

      await request(app).get('/api/messages/ch-1?cursor=abc123&limit=10');

      expect(mockGetChannelMessages).toHaveBeenCalledWith('ch-1', 'abc123', 10);
    });

    it('should default limit to 20', async () => {
      mockGetChannelMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
      });

      await request(app).get('/api/messages/ch-1');

      expect(mockGetChannelMessages).toHaveBeenCalledWith('ch-1', undefined, 20);
    });

    it('should return nextCursor when more messages exist', async () => {
      mockGetChannelMessages.mockResolvedValue({
        messages: [{ _id: 'msg-1' } as any],
        nextCursor: 'cursor-next',
      });

      const res = await request(app).get('/api/messages/ch-1');

      expect(res.body.data.nextCursor).toBe('cursor-next');
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
