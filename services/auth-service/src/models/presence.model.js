const mongoose = require('mongoose');
const { Schema } = mongoose;

const PresenceSchema = new Schema(
    {
        userId: { type: String, required: true, unique: true },
        socketId: { type: String, required: true },
        username: { type: String, required: true },
        channels: [{ type: String }],
        lastSeen: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

PresenceSchema.index({ channels: 1 });

const Presence = mongoose.model('Presence', PresenceSchema);

module.exports = { Presence };
