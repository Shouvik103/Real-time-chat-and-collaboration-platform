// =============================================================================
// Auth Routes — /register, /login, /logout, /refresh, /me, OAuth flows
// =============================================================================

import { Router } from 'express';
import passport from '../config/passport';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { authLimiter } from '../middleware/rateLimiter';
import {
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema,
    meSchema,
    oauthStartSchema,
    oauthCallbackSchema,
} from '../validators/auth.validator';
import {
    register,
    login,
    logout,
    refresh,
    me,
    oauthCallback,
} from '../controllers/auth.controller';

const router = Router();
const oauthFailureRedirect = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`;

// ── Local auth ──────────────────────────────────────────────────────────────

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', validate(logoutSchema), authenticate, logout);
router.post('/refresh', authLimiter, validate(refreshSchema), refresh);
router.get('/me', validate(meSchema), authenticate, me);

// ── Google OAuth ────────────────────────────────────────────────────────────

router.get(
    '/google',
    validate(oauthStartSchema),
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

router.get(
    '/google/callback',
    validate(oauthCallbackSchema),
    passport.authenticate('google', { session: false, failureRedirect: oauthFailureRedirect }),
    oauthCallback,
);

// ── GitHub OAuth ────────────────────────────────────────────────────────────

router.get(
    '/github',
    validate(oauthStartSchema),
    passport.authenticate('github', { scope: ['user:email'], session: false }),
);

router.get(
    '/github/callback',
    validate(oauthCallbackSchema),
    passport.authenticate('github', { session: false, failureRedirect: oauthFailureRedirect }),
    oauthCallback,
);

export default router;
