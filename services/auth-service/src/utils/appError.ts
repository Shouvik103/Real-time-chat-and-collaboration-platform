// =============================================================================
// AppError — Custom error class for operational errors
// Used by controllers and caught by the global error handler
// =============================================================================

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // distinguishes from programmer errors
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
