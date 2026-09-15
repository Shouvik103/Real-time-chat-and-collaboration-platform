// =============================================================================
// Standardised API Response Helpers
// Every endpoint returns { success, data } or { success, error: { code, message } }
// =============================================================================

/**
 * Send a uniform success response.
 */
const sendSuccess = (res, data, statusCode = 200) => {
    res.status(statusCode).json({ success: true, data });
};

/**
 * Send a uniform error response.
 */
const sendError = (res, code, message, statusCode = 400) => {
    res.status(statusCode).json({
        success: false,
        error: { code, message },
    });
};

module.exports = { sendSuccess, sendError };
