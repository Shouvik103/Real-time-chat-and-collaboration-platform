const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageType = {
    TEXT: 'text',
    IMAGE: 'image',
    SYSTEM: 'system',
};

const ReactionSchema = new Schema(
    {
        emoji: { type: String, required: true },
        users: [{ type: String }],
    },
    { _id: false },
);

const MessageSchema = new Schema(
    {
        channelId: { type: String, required: true, index: true },
        senderId: { type: String, required: true, index: true },
        senderName: { type: String, required: true },
        content: { type: String, required: true },
        type: { type: String, enum: Object.values(MessageType), default: MessageType.TEXT },
        reactions: { type: [ReactionSchema], default: [] },
        edited: { type: Boolean, default: false },
        editedAt: { type: Date },
        deleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

// Normalize _id → id in JSON output (used by Socket.IO emit and res.json)
MessageSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret._id;
    },
});

MessageSchema.index({ channelId: 1, createdAt: -1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = { Message, MessageType };
