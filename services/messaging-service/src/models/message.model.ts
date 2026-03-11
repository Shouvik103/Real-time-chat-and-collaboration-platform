import mongoose, { Schema, Document, Types } from 'mongoose';

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    FILE = 'file',
    SYSTEM = 'system',
}

export interface IReaction {
    emoji: string;
    users: string[];
}

export interface IMessage extends Document {
    _id: Types.ObjectId;
    channelId: string;
    senderId: string;
    senderName: string;
    content: string;
    type: MessageType;
    fileId?: string;
    reactions: IReaction[];
    edited: boolean;
    editedAt?: Date;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
    {
        emoji: { type: String, required: true },
        users: [{ type: String }],
    },
    { _id: false },
);

const MessageSchema = new Schema<IMessage>(
    {
        channelId: { type: String, required: true, index: true },
        senderId: { type: String, required: true, index: true },
        senderName: { type: String, required: true },
        content: { type: String, required: true },
        type: { type: String, enum: Object.values(MessageType), default: MessageType.TEXT },
        fileId: { type: String },
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
    transform(_doc: any, ret: any) {
        ret.id = ret._id?.toString();
        delete ret._id;
    },
});

MessageSchema.index({ channelId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
