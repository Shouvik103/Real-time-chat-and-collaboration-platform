import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://chat_admin:chat_password@localhost:27017/chat_messages?authSource=admin';

export const connectMongo = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGODB_URI);
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error('MongoDB connection failed', { error: (err as Error).message });
        throw err;
    }
};

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB error', { error: err.message }));
