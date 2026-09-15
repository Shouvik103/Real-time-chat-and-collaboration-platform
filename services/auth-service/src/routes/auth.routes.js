// =============================================================================
// Auth Routes — /register, /login, /logout, /refresh, /me, OAuth flows
// =============================================================================

const { Router } = require('express');
const passport = require('../config/passport');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema,
    meSchema,
    oauthStartSchema,
    oauthCallbackSchema,
} = require('../validators/auth.validator');
const {
    register,
    login,
    logout,
    refresh,
    me,
    oauthCallback,
} = require('../controllers/auth.controller');

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
    (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        const returnUrl = req.query.returnUrl || req.headers.referer || process.env.FRONTEND_URL;
        let state;
        if (returnUrl) {
            const cleanUrl = returnUrl.replace(/\/login\/?$/, '').replace(/\/$/, '');
            state = Buffer.from(JSON.stringify({ returnUrl: cleanUrl })).toString('base64');
        }
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false,
            state,
        })(req, res, next);
    },
);

router.get(
    '/google/callback',
    validate(oauthCallbackSchema),
    passport.authenticate('google', { session: false, failureRedirect: oauthFailureRedirect }),
    oauthCallback,
);

module.exports = router;
