const { Types } = require('mongoose');
const { Message, MessageType } = require('../models/message.model');

const createMessage = async (input) => {
    const msg = new Message({
        channelId: input.channelId,
        senderId: input.senderId,
        senderName: input.senderName,
        content: input.content,
        type: input.type || MessageType.TEXT,
    });
    return msg.save();
};

const editMessage = async (messageId, senderId, content) => {
    return Message.findOneAndUpdate(
        { _id: new Types.ObjectId(messageId), senderId, deleted: false },
        { content, edited: true, editedAt: new Date() },
        { new: true },
    );
};

const softDeleteMessage = async (messageId, senderId) => {
    return Message.findOneAndUpdate(
        { _id: new Types.ObjectId(messageId), senderId, deleted: false },
        { deleted: true, content: '' },
        { new: true },
    );
};

const toggleReaction = async (messageId, userId, emoji) => {
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

/** Normalise a lean document: map _id → id for the frontend. */
const normaliseLean = (doc) => {
    const { _id, __v, ...rest } = doc;
    return { id: _id.toString(), ...rest };
};

/** Delete all messages for a channel (called when a channel is deleted). */
const deleteChannelMessages = async (channelId) => {
    const result = await Message.deleteMany({ channelId });
    return result.deletedCount ?? 0;
};

const { decrypt } = require('./encryption.service');

/** Cursor-based pagination — returns messages before the cursor (or latest). */
const getChannelMessages = async (channelId, cursor, limit = 20) => {
    const query = { channelId, deleted: false };
    if (cursor) {
        query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean();

    let nextCursor = null;
    if (messages.length > limit) {
        const extra = messages.pop();
        nextCursor = extra._id.toString();
    }

    const decrypted = await Promise.all(
        messages.map(async (doc) => {
            const m = normaliseLean(doc);
            m.content = await decrypt(m.content);
            return m;
        }),
    );

    return { messages: decrypted, nextCursor };
};

module.exports = {
    createMessage,
    editMessage,
    softDeleteMessage,
    toggleReaction,
    deleteChannelMessages,
    getChannelMessages,
};
