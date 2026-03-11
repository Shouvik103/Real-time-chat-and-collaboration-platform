// =============================================================================
// Redis Client Configuration
// Used for: refresh-token storage, access-token blacklist, session caching
// =============================================================================

import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://:chat_password@localhost:6379';

/**
 * Singleton Redis client shared across the Auth Service.
 * Reconnects automatically with exponential back-off (max 5 s).
 */
export const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis reconnecting… attempt ${times}, next retry in ${delay}ms`);
        return delay;
    },
    lazyConnect: false,
});

// ── Connection lifecycle logging ────────────────────────────────────────────

redis.on('connect', () => {
    logger.info('✅ Redis client connected');
});

redis.on('ready', () => {
    logger.info('✅ Redis client ready');
});

redis.on('error', (err: Error) => {
    logger.error('❌ Redis client error', { error: err.message });
});

redis.on('close', () => {
    logger.warn('⚠️  Redis connection closed');
});
