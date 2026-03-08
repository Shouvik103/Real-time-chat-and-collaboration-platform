import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth';
import { Presence } from '../../models/presence.model';
import { logger } from '../../utils/logger';

export const registerPresenceHandlers = (io: Server, socket: AuthenticatedSocket): void => {
    // A client can explicitly signal offline (e.g. going idle)
    socket.on('user_offline', async () => {
        try {
            await Presence.deleteOne({ userId: socket.userId });
            io.emit('user_offline', { userId: socket.userId });
        } catch (err) {
            logger.error('user_offline error', { error: (err as Error).message });
        }
    });

    // Re-signal online (e.g. coming back from idle)
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
            logger.error('user_online error', { error: (err as Error).message });
        }
    });
};
