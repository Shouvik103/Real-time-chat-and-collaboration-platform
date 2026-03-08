// =============================================================================
// Winston Logger — structured logging for the Auth Service
// =============================================================================

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Human-readable format for local development.
 */
const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
    }),
);

/**
 * JSON format for production (ELK / CloudWatch / Datadog).
 */
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json(),
);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: 'auth-service' },
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [
        new winston.transports.Console(),
    ],
});
