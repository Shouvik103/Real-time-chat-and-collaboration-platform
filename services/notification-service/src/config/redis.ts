import { Emitter } from '@socket.io/redis-emitter';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://:chat_password@localhost:6379';

const redisClient = new Redis(REDIS_URL);

redisClient.on('error', (err) => {
    logger.error('Redis connection error in notification-service', { error: err.message });
});

redisClient.on('connect', () => {
    logger.info('✅ Connected to Redis (Notification Service Emitter)');
});

export const socketEmitter = new Emitter(redisClient);
