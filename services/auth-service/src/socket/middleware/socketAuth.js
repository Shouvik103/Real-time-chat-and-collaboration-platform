const jwt = require('jsonwebtoken');
const { logger } = require('../../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Socket.IO middleware — verifies the JWT sent in the handshake auth header.
 * Attaches userId, email, and username to the socket instance.
 */
const socketAuth = (socket, next) => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        socket.userId = decoded.userId;
        socket.email = decoded.email;
        socket.username =
            decoded.displayName || decoded.email?.split('@')[0] || decoded.userId;

        next();
    } catch (err) {
        logger.debug('Socket auth failed', { error: err.message });
        next(new Error('Invalid or expired token'));
    }
};

module.exports = { socketAuth };
