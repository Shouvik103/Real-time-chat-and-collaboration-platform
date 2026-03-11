import { z } from 'zod';

export const uploadFileSchema = z.object({
    body: z.object({
        channelId: z.string().uuid('channelId must be a valid UUID').optional(),
        messageId: z.string().uuid('messageId must be a valid UUID').optional(),
        isPublic: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
    }),
});

export const fileIdParamSchema = z.object({
    params: z.object({
        fileId: z.string().uuid('fileId must be a valid UUID'),
    }),
});

export const channelFilesSchema = z.object({
    params: z.object({
        channelId: z.string().uuid('channelId must be a valid UUID'),
    }),
    query: z.object({
        cursor: z.string().uuid().optional(),
        limit: z
            .string()
            .optional()
            .transform((v) => (v ? parseInt(v, 10) : 20))
            .pipe(z.number().int().min(1).max(100)),
    }),
});
