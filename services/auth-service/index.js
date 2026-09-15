// =============================================================================
// Chat Platform — Unified Backend Entrypoint
// Connects to PostgreSQL, MongoDB & Redis, then starts Express + Socket.IO
// =============================================================================

require('dotenv/config');
const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const { logger } = require('./src/utils/logger');
const { redis } = require('./src/config/redis');
const { connectMongo } = require('./src/config/mongodb');
const { socketAuth } = require('./src/socket/middleware/socketAuth');
const { registerSocketHandlers } = require('./src/socket/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PORT = parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10);

/**
 * Boot sequence:
 * 1. Connect to PostgreSQL via Prisma
 * 2. Connect to MongoDB via Mongoose
 * 3. Ping Redis to ensure connectivity
 * 4. Start HTTP server with Socket.IO
 */
const start = async () => {
    try {
        // ── PostgreSQL ────────────────────────────────────────────────────────
        await prisma.$connect();
        logger.info('✅ Connected to PostgreSQL');

        // ── MongoDB ──────────────────────────────────────────────────────────
        await connectMongo();

        // ── Redis ─────────────────────────────────────────────────────────────
        await redis.ping();
        logger.info('✅ Connected to Redis');

        // ── HTTP Server ──────────────────────────────────────────────────────
        const server = http.createServer(app);

        // ── Socket.IO ────────────────────────────────────────────────────────
        const allowedSocketOrigins = (process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
            .split(',')
            .map((o) => o.trim());

        const io = new Server(server, {
            cors: {
                origin: (origin, callback) => {
                    if (!origin || allowedSocketOrigins.includes(origin) || allowedSocketOrigins.includes('*') || origin.endsWith('.vercel.app')) {
                        callback(null, true);
                    } else {
                        callback(null, true);
                    }
                },
                credentials: true,
            },
            pingInterval: 25000,
            pingTimeout: 20000,
        });

        // Socket auth middleware + event handlers
        io.use(socketAuth);
        registerSocketHandlers(io);

        // ── Start listening ──────────────────────────────────────────────────
        server.listen(PORT, () => {
            logger.info(`🚀 Chat Backend listening on port ${PORT}`);
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info(`${signal} received — shutting down`);
            io.close();
            await prisma.$disconnect();
            redis.disconnect();
            server.close(() => process.exit(0));
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    } catch (error) {
        logger.error('❌ Failed to start Chat Backend', { error });
        process.exit(1);
    }
};

// Catch unhandled rejections
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

start();
