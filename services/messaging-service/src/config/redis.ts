import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://:chat_password@localhost:6379';

export const pubClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis pub reconnecting — attempt ${times}, retry in ${delay}ms`);
        return delay;
    },
});

export const subClient = pubClient.duplicate();

export const redis = pubClient;

pubClient.on('connect', () => logger.info('Redis pub client connected'));
pubClient.on('error', (err: Error) => logger.error('Redis pub error', { error: err.message }));
subClient.on('connect', () => logger.info('Redis sub client connected'));
subClient.on('error', (err: Error) => logger.error('Redis sub error', { error: err.message }));
