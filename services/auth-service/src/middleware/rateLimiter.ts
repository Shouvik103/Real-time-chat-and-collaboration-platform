// =============================================================================
// Rate Limiter Middleware — express-rate-limit configuration
// =============================================================================

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

const isLocalhost = (req: Request): boolean => {
    const ip = req.ip ?? '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.');
};

/**
 * General API rate limiter.
 * 100 requests per 15-minute window per IP.
 * Skipped entirely for localhost (development).
 */
const _apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests, please try again later.',
        },
    },
});

export const apiLimiter = (req: Request, res: Response, next: NextFunction) => {
    if (isLocalhost(req)) return next();
    return _apiLimiter(req, res, next);
};

/**
 * Strict rate limiter for auth-sensitive endpoints (login, register, refresh).
 * 20 requests per 15-minute window per IP.
 * Skipped entirely for localhost (development).
 */
const _authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many authentication attempts, please try again later.',
        },
    },
});

export const authLimiter = (req: Request, res: Response, next: NextFunction) => {
    if (isLocalhost(req)) return next();
    return _authLimiter(req, res, next);
};
