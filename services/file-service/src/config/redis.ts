import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://:chatpassword@localhost:6379';

export const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis reconnecting… attempt ${times}, next retry in ${delay}ms`);
        return delay;
    },
    lazyConnect: false,
});

redis.on('connect', () => { logger.info('✅ Redis client connected'); });
redis.on('ready', () => { logger.info('✅ Redis client ready'); });
redis.on('error', (err: Error) => { logger.error('❌ Redis client error', { error: err.message }); });
redis.on('close', () => { logger.warn('⚠️  Redis connection closed'); });
