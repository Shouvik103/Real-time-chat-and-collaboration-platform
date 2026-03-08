import { getRabbitChannel, EXCHANGE_NAME } from '../config/rabbitmq';
import { IMessage } from '../models/message.model';
import { logger } from '../utils/logger';

export const publishNewMessage = (message: IMessage): void => {
    try {
        const channel = getRabbitChannel();
        const routingKey = 'message.new';
        channel.publish(
            EXCHANGE_NAME,
            routingKey,
            Buffer.from(JSON.stringify({
                messageId: message._id.toString(),
                channelId: message.channelId,
                senderId: message.senderId,
                senderName: message.senderName,
                content: message.content,
                type: message.type,
                createdAt: message.createdAt,
            })),
            { persistent: true, contentType: 'application/json' },
        );
        logger.debug(`Published message ${message._id} to RabbitMQ`);
    } catch (err) {
        logger.error('Failed to publish message to RabbitMQ', { error: (err as Error).message });
    }
};
