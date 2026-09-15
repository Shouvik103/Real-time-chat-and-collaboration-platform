// =============================================================================
// Auth Controller — register, login, logout, refresh, me, OAuth callbacks
// =============================================================================

const { PrismaClient } = require('@prisma/client');
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    blacklistAccessToken,
    isRefreshTokenValid,
    revokeRefreshToken,
    revokeAllRefreshTokens,
} = require('../services/jwt.service');
const { hashPassword, comparePassword } = require('../services/password.service');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { AppError } = require('../utils/appError');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

/** Cookie options for the refresh token */
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ── Helper: strip sensitive fields before sending user to the client ────────

const sanitiseUser = (user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    description: user.description,
    dob: user.dob,
    gender: user.gender,
    status: user.status,
    provider: user.provider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// POST /register
const register = async (req, res, next) => {
    try {
        const { email, password, displayName } = req.body;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            sendError(res, 'EMAIL_TAKEN', 'An account with this email already exists', 409);
            return;
        }
        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, displayName },
        });
        const accessToken = signAccessToken({ userId: user.id, email: user.email, displayName: user.displayName });
        const refreshToken = await signRefreshToken({ userId: user.id, email: user.email, displayName: user.displayName });
        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
        logger.info(`User registered: ${user.id}`);
        sendSuccess(res, { user: sanitiseUser(user), accessToken, refreshToken }, 201);
    } catch (err) {
        next(err);
    }
};

// POST /login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
            return;
        }
        const valid = await comparePassword(password, user.password);
        if (!valid) {
            sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
            return;
        }
        if (user.status !== 'ACTIVE') {
            sendError(res, 'ACCOUNT_DISABLED', 'Your account has been suspended', 403);
            return;
        }
        const accessToken = signAccessToken({ userId: user.id, email: user.email, displayName: user.displayName });
        const refreshToken = await signRefreshToken({ userId: user.id, email: user.email, displayName: user.displayName });
        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
        logger.info(`User logged in: ${user.id}`);
        sendSuccess(res, { user: sanitiseUser(user), accessToken, refreshToken });
    } catch (err) {
        next(err);
    }
};

// POST /logout
const logout = async (req, res, next) => {
    try {
        const user = req.user;
        const jti = req.tokenJti;
        await blacklistAccessToken(jti);
        await revokeAllRefreshTokens(user.id);
        res.clearCookie('refreshToken', { path: '/' });
        logger.info(`User logged out: ${user.id}`);
        sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

// POST /refresh
const refresh = async (req, res, next) => {
    try {
        const token = req.body.refreshToken || req.cookies?.refreshToken;
        if (!token) {
            sendError(res, 'NO_REFRESH_TOKEN', 'Refresh token is required', 400);
            return;
        }
        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch {
            sendError(res, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
            return;
        }
        const valid = await isRefreshTokenValid(decoded.userId, decoded.jti);
        if (!valid) {
            await revokeAllRefreshTokens(decoded.userId);
            sendError(res, 'REFRESH_TOKEN_REUSE', 'Refresh token has already been used. All sessions have been revoked for security.', 401);
            return;
        }
        await revokeRefreshToken(decoded.userId, decoded.jti);
        const refreshUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!refreshUser) {
            sendError(res, 'USER_NOT_FOUND', 'User no longer exists', 401);
            return;
        }
        const accessToken = signAccessToken({ userId: refreshUser.id, email: refreshUser.email, displayName: refreshUser.displayName });
        const refreshToken = await signRefreshToken({ userId: refreshUser.id, email: refreshUser.email, displayName: refreshUser.displayName });
        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
        logger.info(`Token refreshed for user: ${refreshUser.id}`);
        sendSuccess(res, { accessToken, refreshToken });
    } catch (err) {
        next(err);
    }
};

// GET /me
const me = async (req, res, next) => {
    try {
        const user = req.user;
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { memberships: { include: { workspace: true } } },
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

// OAuth Callback
const oauthCallback = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'OAUTH_FAILED', 'OAuth authentication failed');
        }
        const accessToken = signAccessToken({ userId: user.id, email: user.email, displayName: user.displayName });
        const refreshToken = await signRefreshToken({ userId: user.id, email: user.email, displayName: user.displayName });
        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
        let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        if (req.query?.state) {
            try {
                const parsed = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                if (parsed.returnUrl) frontendUrl = parsed.returnUrl;
            } catch {}
        }
        const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
        logger.info(`OAuth login successful for user: ${user.id}, redirecting to frontend at ${frontendUrl}`);
        res.redirect(redirectUrl);
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, logout, refresh, me, oauthCallback };
