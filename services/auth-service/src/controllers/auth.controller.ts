// =============================================================================
// Auth Controller — register, login, logout, refresh, me, OAuth callbacks
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    blacklistAccessToken,
    isRefreshTokenValid,
    revokeRefreshToken,
    revokeAllRefreshTokens,
} from '../services/jwt.service';
import { hashPassword, comparePassword } from '../services/password.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/** Cookie options for the refresh token */
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ── Helper: strip sensitive fields before sending user to the client ────────

const sanitiseUser = (user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
    provider: string;
    createdAt: Date;
    updatedAt: Date;
}) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
    provider: user.provider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /register
// ═══════════════════════════════════════════════════════════════════════════

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { email, password, displayName } = req.body;

        // Check for existing user
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            sendError(res, 'EMAIL_TAKEN', 'An account with this email already exists', 409);
            return;
        }

        // Hash password & create user
        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, displayName },
        });

        // Issue tokens
        const accessToken = signAccessToken({ userId: user.id, email: user.email });
        const refreshToken = await signRefreshToken({ userId: user.id, email: user.email });

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

        logger.info(`User registered: ${user.id}`);

        sendSuccess(
            res,
            {
                user: sanitiseUser(user),
                accessToken,
                refreshToken,
            },
            201,
        );
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /login
// ═══════════════════════════════════════════════════════════════════════════

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
            return;
        }

        // Verify password
        const valid = await comparePassword(password, user.password);
        if (!valid) {
            sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
            return;
        }

        // Check account status
        if (user.status !== 'ACTIVE') {
            sendError(res, 'ACCOUNT_DISABLED', 'Your account has been suspended', 403);
            return;
        }

        // Issue tokens
        const accessToken = signAccessToken({ userId: user.id, email: user.email });
        const refreshToken = await signRefreshToken({ userId: user.id, email: user.email });

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

        logger.info(`User logged in: ${user.id}`);

        sendSuccess(res, {
            user: sanitiseUser(user),
            accessToken,
            refreshToken,
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /logout  (requires authentication)
// ═══════════════════════════════════════════════════════════════════════════

export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const user = req.user!;
        const jti = req.tokenJti!;

        // 1. Blacklist the current access token
        await blacklistAccessToken(jti);

        // 2. Revoke all refresh tokens for this user
        await revokeAllRefreshTokens(user.id);

        // 3. Clear the refresh cookie
        res.clearCookie('refreshToken', { path: '/' });

        logger.info(`User logged out: ${user.id}`);

        sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /refresh  — rotate the refresh token
// ═══════════════════════════════════════════════════════════════════════════

export const refresh = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        // Accept refresh token from body OR httpOnly cookie
        const token: string | undefined =
            req.body.refreshToken || req.cookies?.refreshToken;

        if (!token) {
            sendError(res, 'NO_REFRESH_TOKEN', 'Refresh token is required', 400);
            return;
        }

        // Verify the JWT itself
        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch {
            sendError(res, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
            return;
        }

        // Check Redis to ensure the token hasn't been revoked
        const valid = await isRefreshTokenValid(decoded.userId, decoded.jti);
        if (!valid) {
            // Possible token reuse attack — revoke ALL tokens for this user
            await revokeAllRefreshTokens(decoded.userId);
            sendError(
                res,
                'REFRESH_TOKEN_REUSE',
                'Refresh token has already been used. All sessions have been revoked for security.',
                401,
            );
            return;
        }

        // Revoke the old refresh token (rotation)
        await revokeRefreshToken(decoded.userId, decoded.jti);

        // Issue new token pair
        const accessToken = signAccessToken({ userId: decoded.userId, email: decoded.email });
        const refreshToken = await signRefreshToken({ userId: decoded.userId, email: decoded.email });

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

        logger.info(`Token refreshed for user: ${decoded.userId}`);

        sendSuccess(res, { accessToken, refreshToken });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /me  (requires authentication)
// ═══════════════════════════════════════════════════════════════════════════

export const me = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const user = req.user!;

        // Fetch fresh data with workspace memberships
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                memberships: {
                    include: { workspace: true },
                },
            },
        });

        if (!fullUser) {
            throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
        }

        sendSuccess(res, {
            user: sanitiseUser(fullUser),
            workspaces: fullUser.memberships.map((m) => ({
                id: m.workspace.id,
                name: m.workspace.name,
                slug: m.workspace.slug,
                role: m.role,
                joinedAt: m.joinedAt,
            })),
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// OAuth Callback Handler  (shared by Google + GitHub routes)
// ═══════════════════════════════════════════════════════════════════════════

export const oauthCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        // Passport attaches the user via the strategy's `done(null, user)`
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'OAUTH_FAILED', 'OAuth authentication failed');
        }

        const accessToken = signAccessToken({ userId: user.id, email: user.email });
        const refreshToken = await signRefreshToken({ userId: user.id, email: user.email });

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

        // Redirect to the frontend with tokens as query params
        // The frontend will read them and store appropriately
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;

        logger.info(`OAuth login successful for user: ${user.id}`);
        res.redirect(redirectUrl);
    } catch (err) {
        next(err);
    }
};
