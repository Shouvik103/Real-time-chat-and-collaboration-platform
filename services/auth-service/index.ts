// =============================================================================
// Auth Service — Server Entrypoint
// Connects to PostgreSQL & Redis, then starts Express on AUTH_SERVICE_PORT
// =============================================================================

import 'dotenv/config';
import app from './src/app';
import { logger } from './src/utils/logger';
import { redis } from './src/config/redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10);

/**
 * Boot sequence:
 * 1. Connect to PostgreSQL via Prisma
 * 2. Ping Redis to ensure connectivity
 * 3. Start the HTTP server
 */
const start = async (): Promise<void> => {
    try {
        // ── Database ──────────────────────────────────────────────────────────
        await prisma.$connect();
        logger.info('✅ Connected to PostgreSQL');

        // ── Redis ─────────────────────────────────────────────────────────────
        await redis.ping();
        logger.info('✅ Connected to Redis');

        // ── Server ────────────────────────────────────────────────────────────
        app.listen(PORT, () => {
            logger.info(`🚀 Auth Service listening on port ${PORT}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start Auth Service', { error });
        process.exit(1);
    }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────

const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — shutting down Auth Service…`);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled rejections
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

start();
