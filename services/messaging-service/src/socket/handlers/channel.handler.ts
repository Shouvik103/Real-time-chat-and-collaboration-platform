import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth';
import * as channelService from '../../services/channel.service';
import { logger } from '../../utils/logger';

interface JoinLeavePayload {
    channelId: string;
}

export const registerChannelHandlers = (io: Server, socket: AuthenticatedSocket): void => {
    socket.on('join_channel', async (payload: JoinLeavePayload) => {
        try {
            socket.join(payload.channelId);
            await channelService.joinChannel(socket.userId, payload.channelId);

            // Notify others in the channel
            socket.to(payload.channelId).emit('user_online', { userId: socket.userId });

            logger.debug(`${socket.userId} joined channel ${payload.channelId}`);
        } catch (err) {
            logger.error('join_channel error', { error: (err as Error).message });
        }
    });

    socket.on('leave_channel', async (payload: JoinLeavePayload) => {
        try {
            socket.leave(payload.channelId);
            await channelService.leaveChannel(socket.userId, payload.channelId);

            socket.to(payload.channelId).emit('user_offline', { userId: socket.userId });

            logger.debug(`${socket.userId} left channel ${payload.channelId}`);
        } catch (err) {
            logger.error('leave_channel error', { error: (err as Error).message });
        }
    });
};
