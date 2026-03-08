import jwt, { JwtPayload } from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthenticatedSocket extends Socket {
    userId: string;
    email: string;
    username: string;
}

/**
 * Socket.IO middleware — verifies the JWT sent in the handshake auth header.
 * Attaches userId, email, and username to the socket instance.
 */
export const socketAuth = (socket: Socket, next: (err?: Error) => void): void => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
            userId: string;
            email: string;
        };

        (socket as AuthenticatedSocket).userId = decoded.userId;
        (socket as AuthenticatedSocket).email = decoded.email;
        (socket as AuthenticatedSocket).username =
            decoded.email?.split('@')[0] || decoded.userId;

        next();
    } catch (err) {
        logger.warn('Socket auth failed', { error: (err as Error).message });
        next(new Error('Invalid or expired token'));
    }
};
