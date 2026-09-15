// =============================================================================
// AppError — Custom error class for operational errors
// Used by controllers and caught by the global error handler
// =============================================================================

class AppError extends Error {
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // distinguishes from programmer errors
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { AppError };
