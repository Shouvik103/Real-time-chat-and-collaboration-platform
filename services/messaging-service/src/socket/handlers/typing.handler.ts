import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth';

interface TypingPayload {
    channelId: string;
}

export const registerTypingHandlers = (_io: Server, socket: AuthenticatedSocket): void => {
    socket.on('typing_start', (payload: TypingPayload) => {
        socket.to(payload.channelId).emit('user_typing', {
            userId: socket.userId,
            username: socket.username,
            channelId: payload.channelId,
        });
    });

    socket.on('typing_stop', (payload: TypingPayload) => {
        socket.to(payload.channelId).emit('user_stop_typing', {
            userId: socket.userId,
            username: socket.username,
            channelId: payload.channelId,
        });
    });
};
