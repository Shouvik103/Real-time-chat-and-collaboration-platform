// =============================================================================
// Authenticate Middleware — JWT verification + blacklist check
// Attaches the authenticated user to req.user
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    verifyAccessToken,
    isAccessTokenBlacklisted,
} from '../services/jwt.service';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Express middleware that:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Verifies the JWT signature and expiry
 * 3. Checks the Redis blacklist (for logged-out tokens)
 * 4. Loads the full User from PostgreSQL and attaches to req.user
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        // ── 1. Extract token ──────────────────────────────────────────────────
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            sendError(res, 'UNAUTHORIZED', 'Missing or malformed Authorization header', 401);
            return;
        }

        const token = authHeader.split(' ')[1];

        // ── 2. Verify JWT ─────────────────────────────────────────────────────
        const decoded = verifyAccessToken(token);

        // ── 3. Check blacklist ────────────────────────────────────────────────
        const blacklisted = await isAccessTokenBlacklisted(decoded.jti);
        if (blacklisted) {
            sendError(res, 'TOKEN_REVOKED', 'This token has been revoked', 401);
            return;
        }

        // ── 4. Load user from database ────────────────────────────────────────
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            sendError(res, 'USER_NOT_FOUND', 'User associated with this token no longer exists', 401);
            return;
        }

        if (user.status !== 'ACTIVE') {
            sendError(res, 'ACCOUNT_DISABLED', 'Your account has been suspended or deactivated', 403);
            return;
        }

        // Attach to request
        req.user = user;
        req.tokenJti = decoded.jti;

        next();
    } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'TokenExpiredError') {
            sendError(res, 'TOKEN_EXPIRED', 'Access token has expired', 401);
            return;
        }
        if (error.name === 'JsonWebTokenError') {
            sendError(res, 'INVALID_TOKEN', 'Access token is invalid', 401);
            return;
        }
        logger.error('Authentication error', { error: error.message });
        sendError(res, 'AUTH_ERROR', 'Authentication failed', 500);
    }
};
