import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/apiResponse';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    registerDeviceToken,
    unregisterDeviceToken,
} from '../services/notification.service';
import { getPreferences, updatePreferences } from '../services/preference.service';

// ──── Get Notifications (paginated) ─────────────────────────────────────────
export const getNotificationsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const cursor = req.query.cursor as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
        const result = await getNotifications(req.user.id, cursor, limit);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

// ──── Mark Single as Read ───────────────────────────────────────────────────
export const markReadHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const { id } = req.params;
        const result = await markAsRead(id, req.user.id);
        if (result.count === 0) { sendError(res, 'NOT_FOUND', 'Notification not found', 404); return; }
        sendSuccess(res, { id, isRead: true });
    } catch (err) { next(err); }
};

// ──── Mark All as Read ──────────────────────────────────────────────────────
export const markAllReadHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const result = await markAllAsRead(req.user.id);
        sendSuccess(res, { markedRead: result.count });
    } catch (err) { next(err); }
};

// ──── Mark Channel as Read ──────────────────────────────────────────────────
export const markChannelReadHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const { channelId } = req.params;
        const { prismaClient } = await import('../services/notification.service');
        const result = await prismaClient.notification.updateMany({
            where: { userId: req.user.id, isRead: false, data: { path: ['channelId'], equals: channelId } },
            data: { isRead: true },
        });
        sendSuccess(res, { markedRead: result.count });
    } catch (err) { next(err); }
};

// ──── Unread Count ──────────────────────────────────────────────────────────
export const getUnreadCountHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const count = await getUnreadCount(req.user.id);
        
        // Also get per-channel and per-workspace unread counts
        const { prismaClient } = await import('../services/notification.service');
        const countsRaw = await prismaClient.$queryRaw<{ channelId: string, workspaceId: string, count: bigint }[]>`
            SELECT data->>'channelId' as "channelId", data->>'workspaceId' as "workspaceId", COUNT(*) as count
            FROM notifications
            WHERE user_id = ${req.user.id}::uuid AND is_read = false
            GROUP BY data->>'channelId', data->>'workspaceId'
        `;
        
        const channelCounts: Record<string, number> = {};
        const workspaceCounts: Record<string, number> = {};
        for (const row of countsRaw) {
            const cnt = Number(row.count);
            if (row.channelId) channelCounts[row.channelId] = cnt;
            if (row.workspaceId) workspaceCounts[row.workspaceId] = (workspaceCounts[row.workspaceId] || 0) + cnt;
        }

        sendSuccess(res, { unreadCount: count, channelCounts, workspaceCounts });
    } catch (err) { next(err); }
};

// ──── Register Device Token ─────────────────────────────────────────────────
export const registerTokenHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const { token, platform } = req.body;
        const deviceToken = await registerDeviceToken(req.user.id, token, platform);
        sendSuccess(res, { id: deviceToken.id, token: deviceToken.token, platform: deviceToken.platform }, 201);
    } catch (err) { next(err); }
};

// ──── Unregister Device Token ───────────────────────────────────────────────
export const unregisterTokenHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const { token } = req.params;
        await unregisterDeviceToken(req.user.id, token);
        sendSuccess(res, { deleted: true });
    } catch (err) { next(err); }
};

// ──── Get Preferences ───────────────────────────────────────────────────────
export const getPreferencesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const prefs = await getPreferences(req.user.id);
        sendSuccess(res, prefs);
    } catch (err) { next(err); }
};

// ──── Update Preferences ────────────────────────────────────────────────────
export const updatePreferencesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) { sendError(res, 'UNAUTHORIZED', 'Authentication required', 401); return; }
        const { pushEnabled, emailEnabled, muteUntil, mutedChannels } = req.body;
        const pref = await updatePreferences(req.user.id, {
            ...(pushEnabled !== undefined && { pushEnabled }),
            ...(emailEnabled !== undefined && { emailEnabled }),
            ...(muteUntil !== undefined && { muteUntil: muteUntil ? new Date(muteUntil) : null }),
            ...(mutedChannels !== undefined && { mutedChannels }),
        });
        sendSuccess(res, pref);
    } catch (err) { next(err); }
};
