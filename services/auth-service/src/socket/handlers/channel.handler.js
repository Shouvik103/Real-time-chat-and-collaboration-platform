const channelService = require('../../services/channel.service');
const { logger } = require('../../utils/logger');

const registerChannelHandlers = (io, socket) => {
    socket.on('join_channel', async (payload) => {
        try {
            socket.join(payload.channelId);
            await channelService.joinChannel(socket.userId, payload.channelId);
            socket.to(payload.channelId).emit('user_online', { userId: socket.userId });
            logger.debug(`${socket.userId} joined channel ${payload.channelId}`);
        } catch (err) {
            logger.error('join_channel error', { error: err.message });
        }
    });

    socket.on('leave_channel', async (payload) => {
        try {
            socket.leave(payload.channelId);
            await channelService.leaveChannel(socket.userId, payload.channelId);
            socket.to(payload.channelId).emit('user_offline', { userId: socket.userId });
            logger.debug(`${socket.userId} left channel ${payload.channelId}`);
        } catch (err) {
            logger.error('leave_channel error', { error: err.message });
        }
    });
};

module.exports = { registerChannelHandlers };
