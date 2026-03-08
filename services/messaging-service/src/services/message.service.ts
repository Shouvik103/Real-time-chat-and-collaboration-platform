import { Types } from 'mongoose';
import { Message, IMessage, MessageType } from '../models/message.model';

interface CreateMessageInput {
    channelId: string;
    senderId: string;
    senderName: string;
    content: string;
    type?: MessageType;
    fileId?: string;
}

export const createMessage = async (input: CreateMessageInput): Promise<IMessage> => {
    const msg = new Message({
        channelId: input.channelId,
        senderId: input.senderId,
        senderName: input.senderName,
        content: input.content,
        type: input.type || MessageType.TEXT,
        fileId: input.fileId,
    });
    return msg.save();
};

export const editMessage = async (
    messageId: string,
    senderId: string,
    content: string,
): Promise<IMessage | null> => {
    return Message.findOneAndUpdate(
        { _id: new Types.ObjectId(messageId), senderId, deleted: false },
        { content, edited: true, editedAt: new Date() },
        { new: true },
    );
};

export const softDeleteMessage = async (
    messageId: string,
    senderId: string,
): Promise<IMessage | null> => {
    return Message.findOneAndUpdate(
        { _id: new Types.ObjectId(messageId), senderId, deleted: false },
        { deleted: true, content: '' },
        { new: true },
    );
};

export const toggleReaction = async (
    messageId: string,
    userId: string,
    emoji: string,
): Promise<IMessage | null> => {
    const msg = await Message.findById(messageId);
    if (!msg || msg.deleted) return null;

    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) {
        const idx = existing.users.indexOf(userId);
        if (idx === -1) {
            existing.users.push(userId);
        } else {
            existing.users.splice(idx, 1);
            if (existing.users.length === 0) {
                msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
            }
        }
    } else {
        msg.reactions.push({ emoji, users: [userId] });
    }

    return msg.save();
};

/** Cursor-based pagination — returns 20 messages before the cursor (or latest). */
export const getChannelMessages = async (
    channelId: string,
    cursor?: string,
    limit = 20,
): Promise<{ messages: IMessage[]; nextCursor: string | null }> => {
    const query: Record<string, unknown> = { channelId, deleted: false };
    if (cursor) {
        query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean<IMessage[]>();

    let nextCursor: string | null = null;
    if (messages.length > limit) {
        const extra = messages.pop()!;
        nextCursor = extra._id.toString();
    }

    return { messages, nextCursor };
};
