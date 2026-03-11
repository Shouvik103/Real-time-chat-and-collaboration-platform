import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import fileRoutes from './routes/file.routes';
import { sendSuccess } from './utils/apiResponse';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('short'));
app.use(apiLimiter);

app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'healthy', service: 'file-service', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.use('/api/files', fileRoutes);

app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' } });
});

app.use(errorHandler);

export default app;
