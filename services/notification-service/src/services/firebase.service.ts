import { getMessaging } from '../config/firebase';
import { removeInvalidToken } from './notification.service';
import { logger } from '../utils/logger';

interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
}

export const sendToDevice = async (token: string, payload: PushPayload): Promise<boolean> => {
    const messaging = getMessaging();
    if (!messaging) {
        logger.debug('Firebase not initialised — skipping push');
        return false;
    }

    try {
        await messaging.send({
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
        });
        return true;
    } catch (err: any) {
        if (
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token'
        ) {
            await removeInvalidToken(token);
        } else {
            logger.error('Firebase send failed', { error: err.message, token: token.slice(0, 10) });
        }
        return false;
    }
};

export const sendMulticast = async (tokens: string[], payload: PushPayload): Promise<number> => {
    const messaging = getMessaging();
    if (!messaging || tokens.length === 0) return 0;

    try {
        const response = await messaging.sendEachForMulticast({
            tokens,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
        });

        // Clean up invalid tokens
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (
                    resp.error &&
                    (resp.error.code === 'messaging/registration-token-not-registered' ||
                        resp.error.code === 'messaging/invalid-registration-token')
                ) {
                    removeInvalidToken(tokens[idx]);
                }
            });
        }

        logger.info('Multicast push sent', {
            total: tokens.length,
            success: response.successCount,
            failures: response.failureCount,
        });
        return response.successCount;
    } catch (err) {
        logger.error('Firebase multicast failed', { error: (err as Error).message });
        return 0;
    }
};

export const sendToTopic = async (topic: string, payload: PushPayload): Promise<boolean> => {
    const messaging = getMessaging();
    if (!messaging) return false;

    try {
        await messaging.send({
            topic,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
        });
        return true;
    } catch (err) {
        logger.error('Firebase topic send failed', { error: (err as Error).message, topic });
        return false;
    }
};
