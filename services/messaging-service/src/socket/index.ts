import { Server } from 'socket.io';
import { AuthenticatedSocket } from './middleware/socketAuth';
import { registerMessageHandlers } from './handlers/message.handler';
import { registerChannelHandlers } from './handlers/channel.handler';
import { registerTypingHandlers } from './handlers/typing.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { Presence } from '../models/presence.model';
import { logger } from '../utils/logger';

export const registerSocketHandlers = (io: Server): void => {
    io.on('connection', async (rawSocket) => {
        const socket = rawSocket as AuthenticatedSocket;
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
        });
    });
};
