// =============================================================================
// Global Error Handler — catches all unhandled errors
// Returns the platform's standard { success: false, error: { code, message } }
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

/**
 * Express error-handling middleware (4-arg signature).
 * Must be registered AFTER all routes.
 */
export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    // ── Operational errors (thrown intentionally via AppError) ──────────────
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
            },
        });
        return;
    }

    // ── Prisma known errors ────────────────────────────────────────────────
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err as Error & { code: string; meta?: Record<string, unknown> };

        // Unique constraint violation
        if (prismaErr.code === 'P2002') {
            const target = (prismaErr.meta?.target as string[])?.join(', ') || 'field';
            res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_ENTRY',
                    message: `A record with this ${target} already exists.`,
                },
            });
            return;
        }

        // Record not found
        if (prismaErr.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'The requested resource was not found.',
                },
            });
            return;
        }
    }

    // ── Unexpected / programmer errors ─────────────────────────────────────
    logger.error('Unhandled error', {
        name: err.name,
        message: err.message,
        stack: err.stack,
    });

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message:
                process.env.NODE_ENV === 'production'
                    ? 'An unexpected error occurred.'
                    : err.message,
        },
    });
};
