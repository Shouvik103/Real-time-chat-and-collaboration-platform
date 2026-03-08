// =============================================================================
// Auth Validators — Zod schemas for register / login / refresh
// =============================================================================

import { z } from 'zod';

/**
 * POST /register
 */
export const registerSchema = z.object({
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
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
                'Password must contain uppercase, lowercase, number, and special character',
            ),
        displayName: z
            .string({ required_error: 'Display name is required' })
            .min(2, 'Display name must be at least 2 characters')
            .max(100, 'Display name must be at most 100 characters')
            .trim(),
    }),
});

/**
 * POST /login
 */
export const loginSchema = z.object({
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

/**
 * POST /refresh
 */
export const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string({ required_error: 'Refresh token is required' }).optional(),
    }),
    // The refresh token may also come from an httpOnly cookie — handled in the controller
});

export const logoutSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({}),
});

export const meSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({}),
});

export const oauthStartSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
        state: z.string().optional(),
    }),
});

export const oauthCallbackSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
        code: z.string().optional(),
        state: z.string().optional(),
        error: z.string().optional(),
    }),
});

// Export inferred types for controller use
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
