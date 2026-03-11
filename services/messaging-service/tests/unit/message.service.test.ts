// =============================================================================
// Message Service Unit Tests
// =============================================================================

import { Types } from 'mongoose';

// ── Mock Mongoose Message model ─────────────────────────────────────────────

const mockSave = jest.fn();
const mockLean = jest.fn();
const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
const mockFind = jest.fn().mockReturnValue({ sort: mockSort });
const mockFindOneAndUpdate = jest.fn();
const mockFindById = jest.fn();

jest.mock('../../src/models/message.model', () => {
  const originalModule = jest.requireActual('../../src/models/message.model');
  const MockMessage = jest.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    save: mockSave,
  }));

  (MockMessage as any).find = mockFind;
  (MockMessage as any).findOneAndUpdate = mockFindOneAndUpdate;
  (MockMessage as any).findById = mockFindById;

  return {
    ...originalModule,
    Message: MockMessage,
  };
});

import {
  createMessage,
  editMessage,
  softDeleteMessage,
  toggleReaction,
  getChannelMessages,
} from '../../src/services/message.service';
import { MessageType } from '../../src/models/message.model';

// ═══════════════════════════════════════════════════════════════════════════

describe('Message Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── createMessage ─────────────────────────────────────────────────────

  describe('createMessage()', () => {
    it('should create and save a text message', async () => {
      const savedMsg = {
        _id: new Types.ObjectId(),
        channelId: 'ch-1',
        senderId: 'user-1',
        senderName: 'Alice',
        content: 'Hello world',
        type: MessageType.TEXT,
      };
      mockSave.mockResolvedValue(savedMsg);

      const result = await createMessage({
        channelId: 'ch-1',
        senderId: 'user-1',
        senderName: 'Alice',
        content: 'Hello world',
      });

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(savedMsg);
    });

    it('should accept an optional file type', async () => {
      const savedMsg = {
        _id: new Types.ObjectId(),
        channelId: 'ch-1',
        senderId: 'user-1',
        senderName: 'Alice',
        content: 'file.pdf',
        type: MessageType.FILE,
        fileId: 'file-123',
      };
      mockSave.mockResolvedValue(savedMsg);

      const result = await createMessage({
        channelId: 'ch-1',
        senderId: 'user-1',
        senderName: 'Alice',
        content: 'file.pdf',
        type: MessageType.FILE,
        fileId: 'file-123',
      });

      expect(result.type).toBe(MessageType.FILE);
    });
  });

  // ── editMessage ───────────────────────────────────────────────────────

  describe('editMessage()', () => {
    const VALID_MSG_ID = new Types.ObjectId().toHexString();

    it('should update message content and mark as edited', async () => {
      const updated = {
        _id: new Types.ObjectId(),
        content: 'Updated content',
        edited: true,
        editedAt: new Date(),
      };
      mockFindOneAndUpdate.mockResolvedValue(updated);

      const result = await editMessage(VALID_MSG_ID, 'user-1', 'Updated content');

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.any(Types.ObjectId), senderId: 'user-1', deleted: false },
        { content: 'Updated content', edited: true, editedAt: expect.any(Date) },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should return null when message not found', async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const result = await editMessage(VALID_MSG_ID, 'user-1', 'update');
      expect(result).toBeNull();
    });
  });

  // ── softDeleteMessage ─────────────────────────────────────────────────

  describe('softDeleteMessage()', () => {
    const VALID_MSG_ID = new Types.ObjectId().toHexString();

    it('should soft-delete a message', async () => {
      const deleted = { _id: new Types.ObjectId(), deleted: true, content: '' };
      mockFindOneAndUpdate.mockResolvedValue(deleted);

      const result = await softDeleteMessage(VALID_MSG_ID, 'user-1');

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.any(Types.ObjectId), senderId: 'user-1', deleted: false },
        { deleted: true, content: '' },
        { new: true },
      );
      expect(result!.deleted).toBe(true);
    });

    it('should return null if not found or not owner', async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);
      const result = await softDeleteMessage(VALID_MSG_ID, 'wrong-user');
      expect(result).toBeNull();
    });
  });

  // ── toggleReaction ────────────────────────────────────────────────────

  describe('toggleReaction()', () => {
    it('should add a new reaction', async () => {
      const msg = {
        _id: new Types.ObjectId(),
        deleted: false,
        reactions: [],
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          reactions: [{ emoji: '👍', users: ['user-1'] }],
        }),
      };
      mockFindById.mockResolvedValue(msg);

      const result = await toggleReaction('msg-id', 'user-1', '👍');

      expect(msg.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should remove a user from existing reaction', async () => {
      const msg = {
        _id: new Types.ObjectId(),
        deleted: false,
        reactions: [{ emoji: '👍', users: ['user-1', 'user-2'] }],
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          reactions: [{ emoji: '👍', users: ['user-2'] }],
        }),
      };
      mockFindById.mockResolvedValue(msg);

      const result = await toggleReaction('msg-id', 'user-1', '👍');
      expect(msg.save).toHaveBeenCalled();
    });

    it('should return null for deleted message', async () => {
      mockFindById.mockResolvedValue({ deleted: true, reactions: [] });
      const result = await toggleReaction('msg-id', 'user-1', '👍');
      expect(result).toBeNull();
    });

    it('should return null for non-existent message', async () => {
      mockFindById.mockResolvedValue(null);
      const result = await toggleReaction('msg-id', 'user-1', '👍');
      expect(result).toBeNull();
    });
  });

  // ── getChannelMessages ────────────────────────────────────────────────

  describe('getChannelMessages()', () => {
    it('should return messages with no cursor', async () => {
      const messages = [
        { _id: new Types.ObjectId(), content: 'msg1' },
        { _id: new Types.ObjectId(), content: 'msg2' },
      ];
      mockLean.mockResolvedValue(messages);

      const result = await getChannelMessages('ch-1');

      expect(mockFind).toHaveBeenCalledWith({ channelId: 'ch-1', deleted: false });
      expect(result.messages).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    it('should use cursor for pagination', async () => {
      const cursorId = new Types.ObjectId().toString();
      mockLean.mockResolvedValue([]);

      await getChannelMessages('ch-1', cursorId, 10);

      expect(mockFind).toHaveBeenCalledWith({
        channelId: 'ch-1',
        deleted: false,
        _id: { $lt: expect.any(Types.ObjectId) },
      });
    });

    it('should return nextCursor when there are more results', async () => {
      const ids = Array.from({ length: 21 }, () => new Types.ObjectId());
      const messages = ids.map((id) => ({ _id: id, content: 'msg' }));
      mockLean.mockResolvedValue(messages);

      const result = await getChannelMessages('ch-1', undefined, 20);

      expect(result.messages).toHaveLength(20);
      expect(result.nextCursor).toBeDefined();
    });
  });
});
