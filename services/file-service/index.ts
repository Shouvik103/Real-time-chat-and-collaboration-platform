// =============================================================================
// File Service — Server Entrypoint
// Connects to PostgreSQL, Redis & MinIO, then starts Express on FILE_SERVICE_PORT
// =============================================================================

import app from './src/app';
import { logger } from './src/utils/logger';
import { redis } from './src/config/redis';
import { ensureBucket } from './src/config/minio';
import { prismaClient } from './src/services/fileMetadata.service';

const PORT = parseInt(process.env.FILE_SERVICE_PORT || '3003', 10);

const start = async (): Promise<void> => {
    try {
        await prismaClient.$connect();
        logger.info('✅ Connected to PostgreSQL');

        await redis.ping();
        logger.info('✅ Connected to Redis');

        await ensureBucket();
        logger.info('✅ MinIO ready');

        app.listen(PORT, () => {
            logger.info(`🚀 File Service listening on port ${PORT}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start File Service', { error });
        process.exit(1);
    }
};

const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — shutting down File Service…`);
    await prismaClient.$disconnect();
    redis.disconnect();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

start();
