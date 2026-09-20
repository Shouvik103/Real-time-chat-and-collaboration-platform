// =============================================================================
// Auth Validators — Zod schemas for register / login / refresh
// =============================================================================

const { z } = require('zod');

const sendOtpSchema = z.object({
    body: z.object({
        email: z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address')
            .max(255, 'Email must be at most 255 characters')
            .transform((v) => v.toLowerCase().trim()),
    }),
});

const registerSchema = z.object({
    body: z.object({
        email: z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address')
            .max(255, 'Email must be at most 255 characters')
            .transform((v) => v.toLowerCase().trim()),
        password: z
            .string({ required_error: 'Password is required' })
            .min(8, 'Password must be at least 8 characters')
            .max(128, 'Password must be at most 128 characters')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/,
                'Password must contain uppercase, lowercase, number, and a special character or symbol (e.g. hyphens, @, #, etc.)',
            ),
        displayName: z
            .string({ required_error: 'Display name is required' })
            .min(2, 'Display name must be at least 2 characters')
            .max(100, 'Display name must be at most 100 characters')
            .trim(),
        otp: z
            .string({ required_error: 'Verification code is required' })
            .length(6, 'Verification code must be 6 digits')
            .regex(/^\d{6}$/, 'Verification code must be 6 numeric digits'),
    }),
});

const loginSchema = z.object({
    body: z.object({
        email: z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address')
            .transform((v) => v.toLowerCase().trim()),
        password: z
            .string({ required_error: 'Password is required' })
            .min(1, 'Password is required'),
    }),
});

const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string({ required_error: 'Refresh token is required' }).optional(),
    }),
});

const logoutSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({}),
});

const meSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({}),
});

const oauthStartSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
        state: z.string().optional(),
    }),
});

const oauthCallbackSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
        code: z.string().optional(),
        state: z.string().optional(),
        error: z.string().optional(),
    }),
});

module.exports = {
    sendOtpSchema,
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema,
    meSchema,
    oauthStartSchema,
    oauthCallbackSchema,
};
