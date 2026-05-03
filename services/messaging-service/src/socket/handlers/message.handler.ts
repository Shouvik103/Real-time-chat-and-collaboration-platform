import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth';
import * as messageService from '../../services/message.service';
import { encrypt } from '../../services/encryption.service';
import { publishNewMessage } from '../../services/rabbitmq.service';
import { MessageType } from '../../models/message.model';
import { logger } from '../../utils/logger';

interface SendMessagePayload {
    channelId: string;
    content: string;
    type?: MessageType;
    fileId?: string;
}

interface EditMessagePayload {
    messageId: string;
    content: string;
}

interface DeleteMessagePayload {
    messageId: string;
}

interface ReactPayload {
    messageId: string;
    emoji: string;
}

export const registerMessageHandlers = (io: Server, socket: AuthenticatedSocket): void => {
    // ── send_message ────────────────────────────────────────────────────────
    socket.on('send_message', async (payload: SendMessagePayload) => {
        try {
            // 1. Encrypt content via gRPC
            const encrypted = await encrypt(payload.content);

            // 2. Save to MongoDB
            const message = await messageService.createMessage({
                channelId: payload.channelId,
                senderId: socket.userId,
                senderName: socket.username,
                content: encrypted,
                type: payload.type,
                fileId: payload.fileId,
            });

            // 3. Broadcast to channel room
            io.to(payload.channelId).emit('new_message', message);

            // 4. Publish to RabbitMQ for notification service
            // Important: We send the plaintext payload.content to RabbitMQ so the notification preview is readable!
            publishNewMessage({
                ...message.toObject(),
                content: payload.content
            } as any);
        } catch (err) {
            logger.error('send_message error', { error: (err as Error).message });
            socket.emit('error_event', { event: 'send_message', message: 'Failed to send message' });
        }
    });

    // ── edit_message ────────────────────────────────────────────────────────
    socket.on('edit_message', async (payload: EditMessagePayload) => {
        try {
            const encrypted = await encrypt(payload.content);
            const updated = await messageService.editMessage(
                payload.messageId,
                socket.userId,
                encrypted,
            );
            if (!updated) {
                socket.emit('error_event', { event: 'edit_message', message: 'Message not found or not yours' });
                return;
            }

            io.to(updated.channelId).emit('message_edited', {
                messageId: updated._id.toString(),
                content: updated.content,
                editedAt: updated.editedAt,
            });
        } catch (err) {
            logger.error('edit_message error', { error: (err as Error).message });
            socket.emit('error_event', { event: 'edit_message', message: 'Failed to edit message' });
        }
    });

    // ── delete_message ──────────────────────────────────────────────────────
    socket.on('delete_message', async (payload: DeleteMessagePayload) => {
        try {
            const deleted = await messageService.softDeleteMessage(
                payload.messageId,
                socket.userId,
            );
            if (!deleted) {
                socket.emit('error_event', { event: 'delete_message', message: 'Message not found or not yours' });
                return;
            }

            io.to(deleted.channelId).emit('message_deleted', {
                messageId: deleted._id.toString(),
                channelId: deleted.channelId,
            });
        } catch (err) {
            logger.error('delete_message error', { error: (err as Error).message });
            socket.emit('error_event', { event: 'delete_message', message: 'Failed to delete message' });
        }
    });

    // ── react_to_message ────────────────────────────────────────────────────
    socket.on('react_to_message', async (payload: ReactPayload) => {
        try {
            const updated = await messageService.toggleReaction(
                payload.messageId,
                socket.userId,
                payload.emoji,
            );
            if (!updated) {
                socket.emit('error_event', { event: 'react_to_message', message: 'Message not found' });
                return;
            }

            io.to(updated.channelId).emit('reaction_updated', {
                messageId: updated._id.toString(),
                reactions: updated.reactions,
            });
        } catch (err) {
            logger.error('react_to_message error', { error: (err as Error).message });
            socket.emit('error_event', { event: 'react_to_message', message: 'Failed to update reaction' });
        }
    });
};
