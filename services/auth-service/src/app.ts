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

app.use(helmet());
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    }),
);

// ── Body parsing ────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logging ─────────────────────────────────────────────────────────────────

app.use(morgan('short'));

// ── Passport (OAuth strategies) ─────────────────────────────────────────────

app.use(passport.initialize());

// ── Rate limiting ───────────────────────────────────────────────────────────

app.use(apiLimiter);

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
