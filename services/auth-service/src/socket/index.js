const { registerMessageHandlers } = require('./handlers/message.handler');
const { registerChannelHandlers } = require('./handlers/channel.handler');
const { registerTypingHandlers } = require('./handlers/typing.handler');
const { registerPresenceHandlers } = require('./handlers/presence.handler');
const { Presence } = require('../models/presence.model');
const { logger } = require('../utils/logger');

const registerSocketHandlers = (io) => {
    io.on('connection', async (socket) => {
        logger.info(`Socket connected: ${socket.userId} (${socket.id})`);

        // Join personal room for global notifications
        socket.join(socket.userId);

        // Upsert presence record
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

        // Broadcast user online to all connected clients
        socket.broadcast.emit('user_online', { userId: socket.userId });
        socket.broadcast.emit('presence_update', {
            userId: socket.userId,
            status: 'online',
            displayName: socket.username || 'User',
        });

        // Register domain-specific event handlers
        registerMessageHandlers(io, socket);
        registerChannelHandlers(io, socket);
        registerTypingHandlers(io, socket);
        registerPresenceHandlers(io, socket);

        // Handle disconnection
        socket.on('disconnect', async () => {
            logger.info(`Socket disconnected: ${socket.userId} (${socket.id})`);
            await Presence.deleteOne({ userId: socket.userId });
            socket.broadcast.emit('user_offline', { userId: socket.userId });
            socket.broadcast.emit('presence_update', {
                userId: socket.userId,
                status: 'offline',
                displayName: socket.username || 'User',
            });
        });
    });
};

module.exports = { registerSocketHandlers };
