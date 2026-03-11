import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

interface TokenPayload {
    userId: string;
    email: string;
    jti: string;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            sendError(res, 'UNAUTHORIZED', 'Missing or malformed Authorization header', 401);
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            displayName: '',
            avatarUrl: null,
            status: 'ACTIVE',
        };
        req.tokenJti = decoded.jti;
        next();
    } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'TokenExpiredError') { sendError(res, 'TOKEN_EXPIRED', 'Access token has expired', 401); return; }
        if (error.name === 'JsonWebTokenError') { sendError(res, 'INVALID_TOKEN', 'Access token is invalid', 401); return; }
        logger.error('Authentication error', { error: error.message });
        sendError(res, 'AUTH_ERROR', 'Authentication failed', 500);
    }
};
