const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://chat_admin:chat_password@localhost:27017/chat_messages?authSource=admin';

const connectMongo = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        logger.info('✅ Connected to MongoDB');
    } catch (err) {
        logger.error('❌ MongoDB connection failed', { error: err.message });
        throw err;
    }
};

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB error', { error: err.message }));

module.exports = { connectMongo };
