// =============================================================================
// Socket.IO Integration Tests — connect, auth, message events
// =============================================================================

import http from 'http';
import { Server } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

// ── Mock dependencies ───────────────────────────────────────────────────────

jest.mock('../../src/services/message.service', () => ({
  createMessage: jest.fn().mockResolvedValue({
    _id: 'msg-id-1',
    channelId: 'ch-1',
    senderId: 'user-1',
    senderName: 'testuser',
    content: 'encrypted-content',
    type: 'text',
    reactions: [],
    deleted: false,
  }),
  editMessage: jest.fn().mockResolvedValue({
    _id: 'msg-id-1',
    channelId: 'ch-1',
    content: 'updated',
    editedAt: new Date(),
  }),
  softDeleteMessage: jest.fn().mockResolvedValue({
    _id: 'msg-id-1',
    channelId: 'ch-1',
    deleted: true,
  }),
  toggleReaction: jest.fn().mockResolvedValue({
    _id: 'msg-id-1',
    channelId: 'ch-1',
    reactions: [{ emoji: '👍', users: ['user-1'] }],
  }),
}));

jest.mock('../../src/services/encryption.service', () => ({
  encrypt: jest.fn().mockResolvedValue('encrypted-content'),
  decrypt: jest.fn().mockResolvedValue('decrypted-content'),
}));

jest.mock('../../src/services/rabbitmq.service', () => ({
  publishNewMessage: jest.fn(),
}));

jest.mock('../../src/services/channel.service', () => ({
  joinChannel: jest.fn().mockResolvedValue(undefined),
  leaveChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/models/presence.model', () => ({
  Presence: {
    deleteOne: jest.fn().mockResolvedValue({}),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

const JWT_SECRET = 'test-secret-for-socket-tests';
process.env.JWT_SECRET = JWT_SECRET;

import { socketAuth } from '../../src/socket/middleware/socketAuth';
import { registerSocketHandlers } from '../../src/socket/index';

// ── Helpers ─────────────────────────────────────────────────────────────────

let httpServer: http.Server;
let ioServer: Server;
let port: number;

const createToken = (userId = 'user-1', email = 'test@example.com') => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
};

const connectClient = (token: string): Promise<ClientSocket> => {
  return new Promise((resolve, reject) => {
    const client = ClientIO(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Connection timeout')), 3000);
  });
};

// ═══════════════════════════════════════════════════════════════════════════

describe('Socket.IO Integration', () => {
  beforeAll((done) => {
    httpServer = http.createServer();
    ioServer = new Server(httpServer, {
      cors: { origin: '*' },
    });

    ioServer.use(socketAuth);
    registerSocketHandlers(ioServer);

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;
      done();
    });
  });

  afterAll((done) => {
    ioServer.close();
    httpServer.close(done);
  });

  // ── Authentication ────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('should connect with a valid JWT token', async () => {
      const token = createToken();
      const client = await connectClient(token);
      expect(client.connected).toBe(true);
      client.disconnect();
    });

    it('should reject connection without a token', async () => {
      await expect(connectClient('')).rejects.toThrow();
    });

    it('should reject connection with an invalid token', async () => {
      await expect(connectClient('invalid-jwt-token')).rejects.toThrow();
    });
  });

  // ── Channel events ────────────────────────────────────────────────────

  describe('Channel events', () => {
    let client: ClientSocket;

    beforeEach(async () => {
      client = await connectClient(createToken());
    });

    afterEach(() => {
      client.disconnect();
    });

    it('should join a channel room', (done) => {
      client.emit('join_channel', { channelId: 'ch-1' });
      // Give time for the handler to execute
      setTimeout(() => {
        const { joinChannel } = require('../../src/services/channel.service');
        expect(joinChannel).toHaveBeenCalledWith('user-1', 'ch-1');
        done();
      }, 200);
    });

    it('should leave a channel room', (done) => {
      client.emit('join_channel', { channelId: 'ch-1' });
      setTimeout(() => {
        client.emit('leave_channel', { channelId: 'ch-1' });
        setTimeout(() => {
          const { leaveChannel } = require('../../src/services/channel.service');
          expect(leaveChannel).toHaveBeenCalledWith('user-1', 'ch-1');
          done();
        }, 200);
      }, 100);
    });
  });

  // ── Message events ────────────────────────────────────────────────────

  describe('Message events', () => {
    let client: ClientSocket;

    beforeEach(async () => {
      client = await connectClient(createToken());
      // Join a channel first
      client.emit('join_channel', { channelId: 'ch-1' });
      await new Promise((r) => setTimeout(r, 100));
    });

    afterEach(() => {
      client.disconnect();
    });

    it('should send a message and receive new_message event', (done) => {
      client.on('new_message', (msg) => {
        expect(msg._id).toBe('msg-id-1');
        expect(msg.channelId).toBe('ch-1');
        done();
      });

      client.emit('send_message', {
        channelId: 'ch-1',
        content: 'Hello!',
      });
    });

    it('should edit a message and receive message_edited event', (done) => {
      client.on('message_edited', (data) => {
        expect(data.messageId).toBe('msg-id-1');
        done();
      });

      client.emit('edit_message', {
        messageId: 'msg-id-1',
        content: 'Edited!',
      });
    });

    it('should delete a message and receive message_deleted event', (done) => {
      client.on('message_deleted', (data) => {
        expect(data.messageId).toBe('msg-id-1');
        done();
      });

      client.emit('delete_message', { messageId: 'msg-id-1' });
    });

    it('should toggle reaction and receive reaction_updated event', (done) => {
      client.on('reaction_updated', (data) => {
        expect(data.messageId).toBe('msg-id-1');
        expect(data.reactions).toBeDefined();
        done();
      });

      client.emit('react_to_message', {
        messageId: 'msg-id-1',
        emoji: '👍',
      });
    });
  });

  // ── Typing events ────────────────────────────────────────────────────

  describe('Typing events', () => {
    let sender: ClientSocket;
    let receiver: ClientSocket;

    beforeEach(async () => {
      sender = await connectClient(createToken('user-1', 'sender@test.com'));
      receiver = await connectClient(createToken('user-2', 'receiver@test.com'));

      sender.emit('join_channel', { channelId: 'ch-typing' });
      receiver.emit('join_channel', { channelId: 'ch-typing' });
      await new Promise((r) => setTimeout(r, 200));
    });

    afterEach(() => {
      sender.disconnect();
      receiver.disconnect();
    });

    it('should broadcast typing_start to other users in channel', (done) => {
      receiver.on('user_typing', (data) => {
        expect(data.userId).toBe('user-1');
        expect(data.channelId).toBe('ch-typing');
        done();
      });

      sender.emit('typing_start', { channelId: 'ch-typing' });
    });

    it('should broadcast typing_stop to other users in channel', (done) => {
      receiver.on('user_stop_typing', (data) => {
        expect(data.userId).toBe('user-1');
        expect(data.channelId).toBe('ch-typing');
        done();
      });

      sender.emit('typing_stop', { channelId: 'ch-typing' });
    });
  });
});
