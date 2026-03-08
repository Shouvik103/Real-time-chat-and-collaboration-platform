import mongoose, { Schema, Document } from 'mongoose';

export interface IPresence extends Document {
    userId: string;
    socketId: string;
    username: string;
    channels: string[];
    lastSeen: Date;
}

const PresenceSchema = new Schema<IPresence>(
    {
        userId: { type: String, required: true, unique: true },
        socketId: { type: String, required: true },
        username: { type: String, required: true },
        channels: [{ type: String }],
        lastSeen: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

PresenceSchema.index({ userId: 1 });
PresenceSchema.index({ channels: 1 });

export const Presence = mongoose.model<IPresence>('Presence', PresenceSchema);
