import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import notificationRoutes from './routes/notification.routes';
import { sendSuccess } from './utils/apiResponse';
import { isRabbitConnected } from './config/rabbitmq';
import { isFirebaseReady } from './config/firebase';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('short'));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
}));

app.get('/health', (_req, res) => {
    sendSuccess(res, {
        status: 'healthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        rabbitmq: isRabbitConnected() ? 'connected' : 'disconnected',
        firebase: isFirebaseReady() ? 'ready' : 'not configured',
    });
});

app.use('/api/notify', notificationRoutes);

app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' } });
});

app.use(errorHandler);

export default app;
