// =============================================================================
// Rate Limiter Middleware — express-rate-limit configuration
// =============================================================================

const rateLimit = require('express-rate-limit');

const isLocalhost = (req) => {
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

const apiLimiter = (req, res, next) => {
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

const authLimiter = (req, res, next) => {
    if (isLocalhost(req)) return next();
    return _authLimiter(req, res, next);
};

module.exports = { apiLimiter, authLimiter };
