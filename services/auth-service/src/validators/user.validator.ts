// =============================================================================
// User Validators — Zod schemas for profile operations and workspace/channels
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
            .refine(
                (val) => val.startsWith('data:image/') || /^https?:\/\//.test(val) || val === '',
                'Avatar must be a valid URL or image',
            )
            .optional(),
        description: z
            .string()
            .max(500, 'Description must be at most 500 characters')
            .optional(),
        dob: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
            .optional(),
        gender: z
            .string()
            .max(50, 'Gender string is too long')
            .optional(),
    }).refine(
        (data) => Object.keys(data).length > 0,
        { message: 'At least one field must be provided to update' },
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

/**
 * POST /workspaces — create a new workspace
 */
export const createWorkspaceSchema = z.object({
    body: z.object({
        name: z
            .string({ required_error: 'Workspace name is required' })
            .min(2, 'Name must be at least 2 characters')
            .max(80, 'Name must be at most 80 characters')
            .trim(),
    }),
});

/**
 * GET /workspaces/:workspaceId/channels — workspace param only
 */
export const workspaceParamSchema = z.object({
    params: z.object({
        workspaceId: z.string().uuid('Invalid workspace ID'),
    }),
});

/**
 * POST /workspaces/:workspaceId/channels — create a channel
 */
export const createChannelSchema = z.object({
    params: z.object({
        workspaceId: z.string().uuid('Invalid workspace ID'),
    }),
    body: z.object({
        name: z
            .string({ required_error: 'Channel name is required' })
            .min(2, 'Name must be at least 2 characters')
            .max(80, 'Name must be at most 80 characters')
            .trim()
            .toLowerCase(),
        description: z.string().max(500).trim().optional(),
        type: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    }),
});

/**
 * POST /workspaces/:workspaceId/members — invite a user by email
 */
export const inviteMemberSchema = z.object({
    params: z.object({
        workspaceId: z.string().uuid('Invalid workspace ID'),
    }),
    body: z.object({
        email: z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address')
            .toLowerCase()
            .trim(),
    }),
});

/**
 * DELETE /workspaces/:workspaceId/members/:userId — remove a member
 */
export const removeMemberSchema = z.object({
    params: z.object({
        workspaceId: z.string().uuid('Invalid workspace ID'),
        userId: z.string().uuid('Invalid user ID'),
    }),
});

/**
 * DELETE /workspaces/:workspaceId — delete a workspace (owner only)
 */
export const deleteWorkspaceSchema = z.object({
    params: z.object({
        workspaceId: z.string().uuid('Invalid workspace ID'),
    }),
});

/**
 * DELETE /workspaces/:workspaceId/channels/:channelId — delete a channel
 */
export const deleteChannelSchema = z.object({
    params: z.object({
        workspaceId: z.string().uuid('Invalid workspace ID'),
        channelId: z.string().uuid('Invalid channel ID'),
    }),
});

/**
 * POST /workspaces/join — join a workspace by invite code
 */
export const joinByCodeSchema = z.object({
    body: z.object({
        inviteCode: z
            .string({ required_error: 'Invite code is required' })
            .trim()
            .min(1, 'Invite code is required'),
    }),
});

// Export inferred types
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>['body'];
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>['body'];
export type CreateChannelInput = z.infer<typeof createChannelSchema>['body'];
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>['body'];
