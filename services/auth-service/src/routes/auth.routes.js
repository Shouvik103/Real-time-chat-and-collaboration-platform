// =============================================================================
// Auth Routes — /register, /login, /logout, /refresh, /me, OAuth flows
// =============================================================================

const { Router } = require('express');
const passport = require('../config/passport');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
    sendOtpSchema,
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema,
    meSchema,
    oauthStartSchema,
    oauthCallbackSchema,
} = require('../validators/auth.validator');
const {
    sendOtp,
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

router.post('/send-otp', authLimiter, validate(sendOtpSchema), sendOtp);
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

        const host = req.headers['x-forwarded-host'] || req.headers.host || '';
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const callbackURL = (!host.includes('localhost') && host)
            ? `${proto}://${host}/api/auth/google/callback`
            : (process.env.GOOGLE_CALLBACK_URL || 'https://16-192-218-162.sslip.io/api/auth/google/callback');

        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false,
            state,
            callbackURL,
        })(req, res, next);
    },
);

router.get(
    '/google/callback',
    validate(oauthCallbackSchema),
    (req, res, next) => {
        const host = req.headers['x-forwarded-host'] || req.headers.host || '';
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const callbackURL = (!host.includes('localhost') && host)
            ? `${proto}://${host}/api/auth/google/callback`
            : (process.env.GOOGLE_CALLBACK_URL || 'https://16-192-218-162.sslip.io/api/auth/google/callback');

        passport.authenticate('google', {
            session: false,
            failureRedirect: oauthFailureRedirect,
            callbackURL,
        })(req, res, next);
    },
    oauthCallback,
);

module.exports = router;
