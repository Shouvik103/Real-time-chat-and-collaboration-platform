import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
        return;
    }

    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err as Error & { code: string; meta?: Record<string, unknown> };
        if (prismaErr.code === 'P2002') {
            const target = (prismaErr.meta?.target as string[])?.join(', ') || 'field';
            res.status(409).json({ success: false, error: { code: 'DUPLICATE_ENTRY', message: `A record with this ${target} already exists.` } });
            return;
        }
        if (prismaErr.code === 'P2025') {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } });
            return;
        }
    }

    logger.error('Unhandled error', { name: err.name, message: err.message, stack: err.stack });
    res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message },
    });
};
