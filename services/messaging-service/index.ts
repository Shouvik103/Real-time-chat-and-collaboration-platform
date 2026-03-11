import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

import app from './src/app';
import { pubClient, subClient } from './src/config/redis';
import { connectMongo } from './src/config/mongodb';
import { connectRabbitMQ, closeRabbitMQ } from './src/config/rabbitmq';
import { socketAuth } from './src/socket/middleware/socketAuth';
import { registerSocketHandlers } from './src/socket/index';
import { logger } from './src/utils/logger';

const PORT = parseInt(process.env.MESSAGING_SERVICE_PORT || '3002', 10);

const start = async (): Promise<void> => {
    // 1. Connect to MongoDB
    await connectMongo();

    // 2. Connect to RabbitMQ
    await connectRabbitMQ();

    // 3. Verify Redis is reachable (pub/sub clients are eagerly connected)
    await pubClient.ping();
    logger.info('Redis ping OK');

    // 4. Create HTTP server
    const server = http.createServer(app);

    // 5. Initialise Socket.IO with Redis adapter
    const io = new Server(server, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
            credentials: true,
        },
        pingInterval: 25000,
        pingTimeout: 20000,
    });

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter attached');

    // 6. Socket auth middleware + event handlers
    io.use(socketAuth);
    registerSocketHandlers(io);

    // 7. Start listening
    server.listen(PORT, () => {
        logger.info(`Messaging Service listening on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info(`${signal} received — shutting down`);
        io.close();
        await closeRabbitMQ();
        pubClient.disconnect();
        subClient.disconnect();
        server.close(() => process.exit(0));
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
};

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
});
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

start();
