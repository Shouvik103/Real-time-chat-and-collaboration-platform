// =============================================================================
// Global Error Handler — catches all unhandled errors
// Returns the platform's standard { success: false, error: { code, message } }
// =============================================================================

const { AppError } = require('../utils/appError');
const { logger } = require('../utils/logger');

/**
 * Express error-handling middleware (4-arg signature).
 * Must be registered AFTER all routes.
 */
const errorHandler = (err, _req, res, _next) => {
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
        // Unique constraint violation
        if (err.code === 'P2002') {
            const target = err.meta?.target?.join(', ') || 'field';
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
        if (err.code === 'P2025') {
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

module.exports = { errorHandler };
