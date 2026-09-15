// =============================================================================
// Validate Middleware — generic Zod schema validator for Express
// Validates req.body, req.query, and req.params against a Zod schema
// =============================================================================

const { ZodError } = require('zod');

/**
 * Returns Express middleware that validates the incoming request against
 * the supplied Zod schema.  On failure it returns a 400 with the platform's
 * standard error envelope.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register);
 */
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            if (parsed.body !== undefined) {
                req.body = parsed.body;
            }
            if (parsed.query !== undefined) {
                req.query = parsed.query;
            }
            if (parsed.params !== undefined) {
                req.params = parsed.params;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const message = error.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join('; ');

                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message,
                    },
                });
                return;
            }
            next(error);
        }
    };
};

module.exports = { validate };
