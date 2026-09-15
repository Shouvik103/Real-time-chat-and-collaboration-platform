const messageService = require('../../services/message.service');
const { encrypt } = require('../../services/encryption.service');
const { logger } = require('../../utils/logger');

const registerMessageHandlers = (io, socket) => {
    // ── send_message ────────────────────────────────────────────────────────
    socket.on('send_message', async (payload) => {
        try {
            const encrypted = await encrypt(payload.content);
            const message = await messageService.createMessage({
                channelId: payload.channelId,
                senderId: socket.userId,
                senderName: socket.username,
                content: encrypted,
                type: payload.type,
            });
            const outMessage = message.toJSON();
            outMessage.content = payload.content;
            io.to(payload.channelId).emit('new_message', outMessage);
        } catch (err) {
            logger.error('send_message error', { error: err.message });
            socket.emit('error_event', { event: 'send_message', message: 'Failed to send message' });
        }
    });

    // ── edit_message ────────────────────────────────────────────────────────
    socket.on('edit_message', async (payload) => {
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
            const outMessage = updated.toJSON();
            outMessage.content = payload.content;
            io.to(updated.channelId).emit('message_updated', outMessage);
        } catch (err) {
            logger.error('edit_message error', { error: err.message });
            socket.emit('error_event', { event: 'edit_message', message: 'Failed to edit message' });
        }
    });

    // ── delete_message ──────────────────────────────────────────────────────
    socket.on('delete_message', async (payload) => {
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
            logger.error('delete_message error', { error: err.message });
            socket.emit('error_event', { event: 'delete_message', message: 'Failed to delete message' });
        }
    });

    // ── react_to_message ────────────────────────────────────────────────────
    socket.on('react_to_message', async (payload) => {
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
            io.to(updated.channelId).emit('message_updated', updated.toJSON());
        } catch (err) {
            logger.error('react_to_message error', { error: err.message });
            socket.emit('error_event', { event: 'react_to_message', message: 'Failed to update reaction' });
        }
    });
};

module.exports = { registerMessageHandlers };
