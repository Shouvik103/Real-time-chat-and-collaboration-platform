import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as messageService from '../services/message.service';

const router = Router();

const paginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * GET /messages/:channelId
 * Cursor-based pagination — 20 messages per page.
 * Query params: ?cursor=<lastMessageId>&limit=20
 */
router.get('/:channelId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { channelId } = req.params;
        const parsed = paginationSchema.parse(req.query);

        const result = await messageService.getChannelMessages(
            channelId,
            parsed.cursor,
            parsed.limit ?? 20,
        );

        res.json({
            success: true,
            data: {
                messages: result.messages,
                nextCursor: result.nextCursor,
            },
        });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /messages/channel/:channelId
 * Deletes all messages for a channel (called when a channel is deleted).
 */
router.delete('/channel/:channelId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { channelId } = req.params;
        const deletedCount = await messageService.deleteChannelMessages(channelId);
        res.json({ success: true, data: { deletedCount } });
    } catch (err) {
        next(err);
    }
});

export default router;
