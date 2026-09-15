const { Presence } = require('../../models/presence.model');
const { logger } = require('../../utils/logger');

const registerPresenceHandlers = (io, socket) => {
    socket.on('user_offline', async () => {
        try {
            await Presence.deleteOne({ userId: socket.userId });
            io.emit('user_offline', { userId: socket.userId });
        } catch (err) {
            logger.error('user_offline error', { error: err.message });
        }
    });

    socket.on('user_online', async () => {
        try {
            await Presence.findOneAndUpdate(
                { userId: socket.userId },
                {
                    userId: socket.userId,
                    socketId: socket.id,
                    username: socket.username,
                    lastSeen: new Date(),
                },
                { upsert: true, new: true },
            );
            io.emit('user_online', { userId: socket.userId });
        } catch (err) {
            logger.error('user_online error', { error: err.message });
        }
    });
};

module.exports = { registerPresenceHandlers };
