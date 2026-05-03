import { ConsumeMessage } from 'amqplib';
import { getRabbitChannel, QUEUE_NAME } from '../config/rabbitmq';
import { createNotification, getDeviceTokens } from '../services/notification.service';
import { shouldNotify } from '../services/preference.service';
import { sendMulticast } from '../services/firebase.service';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { socketEmitter } from '../config/redis';

const prisma = new PrismaClient();
const MAX_RETRIES = 3;

interface NewMessageEvent {
    messageId: string;
    channelId: string;
    senderId: string;
    senderName: string;
    content: string;
    type: string;
    createdAt: string;
}

interface MentionEvent {
    messageId: string;
    channelId: string;
    senderId: string;
    senderName: string;
    mentionedUserId: string;
    content: string;
}

interface ChannelInviteEvent {
    channelId: string;
    channelName: string;
    inviterId: string;
    inviterName: string;
    invitedUserId: string;
}

const getRetryCount = (msg: ConsumeMessage): number => {
    const deaths = msg.properties.headers?.['x-death'] as Array<{ count: number }> | undefined;
    if (!deaths || deaths.length === 0) return 0;
    return deaths[0].count || 0;
};

const truncate = (str: string, len: number): string =>
    str.length > len ? str.slice(0, len) + '…' : str;

// ─── Handlers ────────────────────────────────────────────────────────────────

const handleNewMessage = async (event: NewMessageEvent): Promise<void> => {
    const { channelId, senderId, senderName, content, messageId } = event;

    // Fetch channel members (except sender) from the shared workspace_members / channels table
    // Since auth-service owns the schema, we query the same PostgreSQL database
    const members: Array<{ user_id: string }> = await prisma.$queryRaw`
        SELECT DISTINCT wm.user_id
        FROM workspace_members wm
        INNER JOIN channels c ON c.workspace_id = wm.workspace_id
        WHERE c.id = ${channelId}::uuid
          AND wm.user_id != ${senderId}::uuid
    `;

    const preview = truncate(content, 100);

    for (const member of members) {
        const userId = member.user_id;

        const canNotify = await shouldNotify(userId, channelId);
        if (!canNotify) continue;

        const notification = await createNotification({
            userId,
            type: 'new_message',
            title: `New message from ${senderName}`,
            body: preview,
            data: { messageId, channelId, senderId, type: 'new_message' },
        });

        socketEmitter.to(userId).emit('new_notification', notification);

        const tokens = await getDeviceTokens(userId);
        if (tokens.length > 0) {
            await sendMulticast(tokens, {
                title: senderName,
                body: preview,
                data: { messageId, channelId, type: 'new_message' },
            });
        }
    }

    logger.info('Processed new_message notification', { messageId, channelId, recipientCount: members.length });
};

const handleMention = async (event: MentionEvent): Promise<void> => {
    const { mentionedUserId, senderId, senderName, content, messageId, channelId } = event;

    if (mentionedUserId === senderId) return;

    const canNotify = await shouldNotify(mentionedUserId, channelId);
    if (!canNotify) return;

    const preview = truncate(content, 100);

    const notification = await createNotification({
        userId: mentionedUserId,
        type: 'mention',
        title: `${senderName} mentioned you`,
        body: preview,
        data: { messageId, channelId, senderId, type: 'mention' },
    });

    socketEmitter.to(mentionedUserId).emit('new_notification', notification);

    const tokens = await getDeviceTokens(mentionedUserId);
    if (tokens.length > 0) {
        await sendMulticast(tokens, {
            title: `${senderName} mentioned you`,
            body: preview,
            data: { messageId, channelId, type: 'mention' },
        });
    }

    logger.info('Processed mention notification', { messageId, mentionedUserId });
};

const handleChannelInvite = async (event: ChannelInviteEvent): Promise<void> => {
    const { invitedUserId, inviterName, channelName, channelId } = event;

    const canNotify = await shouldNotify(invitedUserId);
    if (!canNotify) return;

    const notification = await createNotification({
        userId: invitedUserId,
        type: 'channel_invite',
        title: 'Channel Invitation',
        body: `${inviterName} invited you to #${channelName}`,
        data: { channelId, inviterName, type: 'channel_invite' },
    });

    socketEmitter.to(invitedUserId).emit('new_notification', notification);

    const tokens = await getDeviceTokens(invitedUserId);
    if (tokens.length > 0) {
        await sendMulticast(tokens, {
            title: 'Channel Invitation',
            body: `${inviterName} invited you to #${channelName}`,
            data: { channelId, type: 'channel_invite' },
        });
    }

    logger.info('Processed channel_invite notification', { channelId, invitedUserId });
};

// ─── Consumer ────────────────────────────────────────────────────────────────

export const startConsumer = async (): Promise<void> => {
    const channel = getRabbitChannel();

    await channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const routingKey = msg.fields.routingKey;
        const retries = getRetryCount(msg);

        try {
            const payload = JSON.parse(msg.content.toString());

            switch (routingKey) {
                case 'message.new':
                    await handleNewMessage(payload as NewMessageEvent);
                    break;
                case 'message.mention':
                    await handleMention(payload as MentionEvent);
                    break;
                case 'channel.invite':
                    await handleChannelInvite(payload as ChannelInviteEvent);
                    break;
                default:
                    logger.warn('Unknown routing key', { routingKey });
            }

            channel.ack(msg);
        } catch (err) {
            logger.error('Error processing message', {
                routingKey,
                retry: retries,
                error: (err as Error).message,
            });

            if (retries >= MAX_RETRIES) {
                logger.error('Max retries exceeded — sending to DLQ', { routingKey, retries });
                channel.nack(msg, false, false); // send to DLX
            } else {
                // Exponential backoff via delayed re-queue
                const delay = Math.pow(2, retries) * 1000;
                setTimeout(() => {
                    channel.nack(msg, false, true); // requeue
                }, delay);
            }
        }
    });

    logger.info('✅ RabbitMQ consumer started on queue: ' + QUEUE_NAME);
};
