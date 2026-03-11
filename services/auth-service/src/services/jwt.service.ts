// =============================================================================
// JWT Service — sign / verify / rotate / blacklist tokens
// Access tokens : 15 min, blacklisted on logout
// Refresh tokens: 7 days, stored in Redis, rotated on every use
// =============================================================================

import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/redis';

// ── Environment ─────────────────────────────────────────────────────────────

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
/** Access token expiry in seconds (15 minutes) */
const ACCESS_EXPIRY_SECONDS = 15 * 60;
/** Refresh token expiry in seconds (7 days) */
const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/** Refresh token TTL in seconds (must match JWT_REFRESH_EXPIRY) */
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
/** Max TTL for a blacklisted access token – at most 15 minutes */
const ACCESS_TTL_SECONDS = 15 * 60;

// ── Payload typing ──────────────────────────────────────────────────────────

export interface TokenPayload {
    userId: string;
    email: string;
    displayName: string;
}

export interface DecodedToken extends TokenPayload, JwtPayload {
    jti: string;
}

// ── Sign ────────────────────────────────────────────────────────────────────

/**
 * Create a short-lived access token (15 min default).
 * Every token gets a unique `jti` so it can be individually blacklisted.
 */
export const signAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, ACCESS_SECRET, {
        expiresIn: ACCESS_EXPIRY_SECONDS,
        jwtid: uuidv4(),
    });
};

/**
 * Create a long-lived refresh token (7 days default) and persist it in Redis.
 * Only one refresh token per (userId, jti) pair is valid at a time.
 */
export const signRefreshToken = async (payload: TokenPayload): Promise<string> => {
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
export const verifyAccessToken = (token: string): DecodedToken => {
    return jwt.verify(token, ACCESS_SECRET) as DecodedToken;
};

/** Verify and decode a refresh token. Throws on invalid / expired. */
export const verifyRefreshToken = (token: string): DecodedToken => {
    return jwt.verify(token, REFRESH_SECRET) as DecodedToken;
};

// ── Blacklist (access tokens) ───────────────────────────────────────────────

/**
 * Blacklist an access token so it cannot be reused after logout.
 * The key auto-expires when the original token would have expired.
 */
export const blacklistAccessToken = async (jti: string, ttlSeconds?: number): Promise<void> => {
    await redis.set(`blacklist:${jti}`, 'revoked', 'EX', ttlSeconds || ACCESS_TTL_SECONDS);
};

/** Check whether an access token has been blacklisted. */
export const isAccessTokenBlacklisted = async (jti: string): Promise<boolean> => {
    const result = await redis.get(`blacklist:${jti}`);
    return result !== null;
};

// ── Revoke (refresh tokens) ─────────────────────────────────────────────────

/** Check whether a specific refresh token is still valid in Redis. */
export const isRefreshTokenValid = async (userId: string, jti: string): Promise<boolean> => {
    const result = await redis.get(`refresh:${userId}:${jti}`);
    return result === 'valid';
};

/** Revoke a single refresh token (used during rotation). */
export const revokeRefreshToken = async (userId: string, jti: string): Promise<void> => {
    await redis.del(`refresh:${userId}:${jti}`);
};

/** Revoke ALL refresh tokens for a user (e.g. password change, forced logout). */
export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
};
