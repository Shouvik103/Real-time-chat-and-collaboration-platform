const { Router } = require('express');
const { z } = require('zod');
const messageService = require('../services/message.service');

const router = Router();

const paginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * GET /messages/:channelId
 * Cursor-based pagination — 20 messages per page.
 */
router.get('/:channelId', async (req, res, next) => {
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
 */
router.delete('/channel/:channelId', async (req, res, next) => {
    try {
        const { channelId } = req.params;
        const deletedCount = await messageService.deleteChannelMessages(channelId);
        res.json({ success: true, data: { deletedCount } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
