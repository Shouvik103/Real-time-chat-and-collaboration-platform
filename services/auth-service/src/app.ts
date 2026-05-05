// =============================================================================
// Express Application Setup
// Mounts all middleware, routes, and the global error handler
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from './config/passport';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { sendSuccess } from './utils/apiResponse';

const app = express();

// ── Security ────────────────────────────────────────────────────────────────

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'upgrade-insecure-requests': null, // Disable — we serve HTTP in prod
        },
    },
}));
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    }),
);

// ── Body parsing ────────────────────────────────────────────────────────────

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ── Logging ─────────────────────────────────────────────────────────────────

app.use(morgan('short'));

// ── Passport (OAuth strategies) ─────────────────────────────────────────────

app.use(passport.initialize());

// ── Rate limiting ───────────────────────────────────────────────────────────
// OAuth redirect routes are exempt — they're browser-initiated, controlled by
// the provider, and can't be abused in the same way as API endpoints.
// Localhost requests are also exempt for development convenience.
app.use((req, res, next) => {
    const ip = req.ip ?? '';
    const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.');
    if (isLocalhost) return next();
    const oauthPaths = ['/api/auth/google', '/api/auth/github'];
    if (oauthPaths.some((p) => req.path.startsWith(p))) return next();
    return apiLimiter(req, res, next);
});

// ── Health check ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    sendSuccess(res, {
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ── API routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ── 404 catch-all ───────────────────────────────────────────────────────────

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'The requested endpoint does not exist.',
        },
    });
});

// ── Global error handler (must be last) ─────────────────────────────────────

app.use(errorHandler);

export default app;
