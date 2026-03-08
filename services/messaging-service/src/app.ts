import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import messageRoutes from './routes/message.routes';

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(morgan('short'));

app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'healthy', service: 'messaging-service' } });
});

app.use('/api/messages', messageRoutes);

app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = (err as any).statusCode || 500;
    res.status(status).json({
        success: false,
        error: {
            code: (err as any).code || 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
        },
    });
});

export default app;
