// =============================================================================
// Standardised API Response Helpers
// Every endpoint returns { success, data } or { success, error: { code, message } }
// =============================================================================

import { Response } from 'express';

/**
 * Send a uniform success response.
 */
export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): void => {
    res.status(statusCode).json({ success: true, data });
};

/**
 * Send a uniform error response.
 */
export const sendError = (
    res: Response,
    code: string,
    message: string,
    statusCode = 400,
): void => {
    res.status(statusCode).json({
        success: false,
        error: { code, message },
    });
};
