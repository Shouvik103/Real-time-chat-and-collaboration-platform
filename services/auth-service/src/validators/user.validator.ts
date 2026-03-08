// =============================================================================
// User Validators — Zod schemas for profile operations
// =============================================================================

import { z } from 'zod';

/**
 * PATCH /profile — update the current user's profile
 */
export const updateProfileSchema = z.object({
    body: z.object({
        displayName: z
            .string()
            .min(2, 'Display name must be at least 2 characters')
            .max(100, 'Display name must be at most 100 characters')
            .trim()
            .optional(),
        avatarUrl: z
            .string()
            .url('Avatar must be a valid URL')
            .optional(),
    }).refine(
        (data) => data.displayName !== undefined || data.avatarUrl !== undefined,
        { message: 'At least one field (displayName or avatarUrl) must be provided' },
    ),
});

/**
 * GET /profile/:userId — view another user's profile
 */
export const getProfileSchema = z.object({
    params: z.object({
        userId: z.string().uuid('Invalid user ID format'),
    }),
});

/**
 * PATCH /profile/avatar — upload / update avatar URL
 */
export const uploadAvatarSchema = z.object({
    body: z.object({
        avatarUrl: z
            .string({ required_error: 'Avatar URL is required' })
            .url('Avatar must be a valid URL'),
    }),
});

// Export inferred types
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>['body'];
