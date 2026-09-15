// =============================================================================
// JWT Service — sign / verify / rotate / blacklist tokens
// Access tokens : 15 min, blacklisted on logout
// Refresh tokens: 7 days, stored in Redis, rotated on every use
// =============================================================================

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { redis } = require('../config/redis');

// ── Environment ─────────────────────────────────────────────────────────────

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
/** Access token expiry in seconds (15 minutes) */
const ACCESS_EXPIRY_SECONDS = 15 * 60;
/** Refresh token expiry in seconds (7 days) */
const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/** Refresh token TTL in seconds (must match JWT_REFRESH_EXPIRY) */
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
/** Max TTL for a blacklisted access token – at most 15 minutes */
const ACCESS_TTL_SECONDS = 15 * 60;

// ── Sign ────────────────────────────────────────────────────────────────────

/**
 * Create a short-lived access token (15 min default).
 * Every token gets a unique `jti` so it can be individually blacklisted.
 */
const signAccessToken = (payload) => {
    return jwt.sign(payload, ACCESS_SECRET, {
        expiresIn: ACCESS_EXPIRY_SECONDS,
        jwtid: uuidv4(),
    });
};

/**
 * Create a long-lived refresh token (7 days default) and persist it in Redis.
 * Only one refresh token per (userId, jti) pair is valid at a time.
 */
const signRefreshToken = async (payload) => {
    const jti = uuidv4();
    const token = jwt.sign(payload, REFRESH_SECRET, {
        expiresIn: REFRESH_EXPIRY_SECONDS,
        jwtid: jti,
    });

    // Store in Redis with the same TTL as the JWT
    await redis.set(`refresh:${payload.userId}:${jti}`, 'valid', 'EX', REFRESH_TTL_SECONDS);
    return token;
};

// ── Verify ──────────────────────────────────────────────────────────────────

/** Verify and decode an access token. Throws on invalid / expired. */
const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_SECRET);
};

/** Verify and decode a refresh token. Throws on invalid / expired. */
const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};

// ── Blacklist (access tokens) ───────────────────────────────────────────────

/**
 * Blacklist an access token so it cannot be reused after logout.
 * The key auto-expires when the original token would have expired.
 */
const blacklistAccessToken = async (jti, ttlSeconds) => {
    await redis.set(`blacklist:${jti}`, 'revoked', 'EX', ttlSeconds || ACCESS_TTL_SECONDS);
};

/** Check whether an access token has been blacklisted. */
const isAccessTokenBlacklisted = async (jti) => {
    const result = await redis.get(`blacklist:${jti}`);
    return result !== null;
};

// ── Revoke (refresh tokens) ─────────────────────────────────────────────────

/** Check whether a specific refresh token is still valid in Redis. */
const isRefreshTokenValid = async (userId, jti) => {
    const result = await redis.get(`refresh:${userId}:${jti}`);
    return result === 'valid';
};

/** Revoke a single refresh token (used during rotation). */
const revokeRefreshToken = async (userId, jti) => {
    await redis.del(`refresh:${userId}:${jti}`);
};

/** Revoke ALL refresh tokens for a user (e.g. password change, forced logout). */
const revokeAllRefreshTokens = async (userId) => {
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
};

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    blacklistAccessToken,
    isAccessTokenBlacklisted,
    isRefreshTokenValid,
    revokeRefreshToken,
    revokeAllRefreshTokens,
};
