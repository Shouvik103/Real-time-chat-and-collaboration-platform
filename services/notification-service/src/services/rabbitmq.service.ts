import { getRabbitChannel, EXCHANGE_NAME } from '../config/rabbitmq';
import { logger } from '../utils/logger';

export const publishEvent = (routingKey: string, payload: Record<string, unknown>): void => {
    try {
        const channel = getRabbitChannel();
        channel.publish(
            EXCHANGE_NAME,
            routingKey,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true, contentType: 'application/json' },
        );
        logger.debug(`Published event to ${routingKey}`);
    } catch (err) {
        logger.error('Failed to publish event', { routingKey, error: (err as Error).message });
    }
};
