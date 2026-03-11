import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface CreateNotificationInput {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
}

export const createNotification = async (input: CreateNotificationInput) => {
    const notification = await prisma.notification.create({ data: input });
    logger.debug('Notification created', { id: notification.id, userId: input.userId, type: input.type });
    return notification;
};

export const getNotifications = async (userId: string, cursor?: string, limit = 20) => {
    const take = Math.min(limit, 100);
    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notifications.length > take;
    const results = hasMore ? notifications.slice(0, take) : notifications;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    return { notifications: results, nextCursor, hasMore };
};

export const getUnreadCount = async (userId: string): Promise<number> => {
    return prisma.notification.count({ where: { userId, isRead: false } });
};

export const markAsRead = async (notificationId: string, userId: string) => {
    return prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
    });
};

export const markAllAsRead = async (userId: string) => {
    return prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
};

// ─── Device Tokens ───────────────────────────────────────────────────────────

export const registerDeviceToken = async (userId: string, token: string, platform: string) => {
    return prisma.deviceToken.upsert({
        where: { userId_token: { userId, token } },
        update: { platform },
        create: { userId, token, platform },
    });
};

export const unregisterDeviceToken = async (userId: string, token: string) => {
    return prisma.deviceToken.deleteMany({ where: { userId, token } });
};

export const getDeviceTokens = async (userId: string): Promise<string[]> => {
    const tokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
    });
    return tokens.map((t) => t.token);
};

export const removeInvalidToken = async (token: string) => {
    await prisma.deviceToken.deleteMany({ where: { token } });
    logger.info('Removed invalid device token', { token: token.slice(0, 10) + '...' });
};

export const prismaClient = prisma;
