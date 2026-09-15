const registerTypingHandlers = (_io, socket) => {
    socket.on('typing_start', (payload) => {
        const data = {
            userId: socket.userId,
            userName: socket.username || socket.userId,
            username: socket.username || socket.userId,
            channelId: payload.channelId,
        };
        socket.to(payload.channelId).emit('typing_start', data);
        socket.to(payload.channelId).emit('user_typing', data);
    });

    socket.on('typing_stop', (payload) => {
        const data = {
            userId: socket.userId,
            username: socket.username,
            channelId: payload.channelId,
        };
        socket.to(payload.channelId).emit('typing_stop', data);
        socket.to(payload.channelId).emit('user_stop_typing', data);
    });
};

module.exports = { registerTypingHandlers };
