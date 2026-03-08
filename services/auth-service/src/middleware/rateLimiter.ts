// =============================================================================
// Rate Limiter Middleware — express-rate-limit configuration
// =============================================================================

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter.
 * 100 requests per 15-minute window per IP.
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,    // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,     // Disable `X-RateLimit-*` headers
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests, please try again later.',
        },
    },
});

/**
 * Strict rate limiter for auth-sensitive endpoints (login, register, refresh).
 * 20 requests per 15-minute window per IP.
 */
export const authLimiter = rateLimit({
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
