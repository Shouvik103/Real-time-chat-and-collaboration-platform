// =============================================================================
// Notification Service — Server Entrypoint
// Connects to PostgreSQL, RabbitMQ & Firebase, starts Express + consumer
// =============================================================================

import 'dotenv/config';
import app from './src/app';
import { logger } from './src/utils/logger';
import { connectRabbitMQ, closeRabbitMQ } from './src/config/rabbitmq';
import { initFirebase } from './src/config/firebase';
import { startConsumer } from './src/consumers/rabbitmq.consumer';
import { prismaClient } from './src/services/notification.service';

const PORT = parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3004', 10);

const start = async (): Promise<void> => {
    try {
        await prismaClient.$connect();
        logger.info('✅ Connected to PostgreSQL');

        initFirebase();

        await connectRabbitMQ();
        await startConsumer();

        app.listen(PORT, () => {
            logger.info(`🚀 Notification Service listening on port ${PORT}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start Notification Service', { error });
        process.exit(1);
    }
};

const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — shutting down Notification Service…`);
    await closeRabbitMQ();
    await prismaClient.$disconnect();
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
