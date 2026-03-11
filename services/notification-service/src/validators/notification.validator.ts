import { z } from 'zod';

export const notificationIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('id must be a valid UUID'),
    }),
});

export const notificationsQuerySchema = z.object({
    query: z.object({
        cursor: z.string().uuid().optional(),
        limit: z
            .string()
            .optional()
            .transform((v) => (v ? parseInt(v, 10) : 20))
            .pipe(z.number().int().min(1).max(100)),
    }),
});

export const registerTokenSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Token is required').max(500),
        platform: z.enum(['ios', 'android', 'web']),
    }),
});

export const unregisterTokenParamSchema = z.object({
    params: z.object({
        token: z.string().min(1),
    }),
});

export const updatePreferencesSchema = z.object({
    body: z.object({
        pushEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        muteUntil: z.string().datetime().nullable().optional(),
        mutedChannels: z.array(z.string().uuid()).optional(),
    }),
});
