import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ timestamp, level, message, stack, ...meta }) => {
        const m = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${stack || message}${m}`;
    }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: 'messaging-service' },
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [new winston.transports.Console()],
});
