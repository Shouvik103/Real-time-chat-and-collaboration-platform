import amqplib, { ChannelModel, Channel } from 'amqplib';
import { logger } from '../utils/logger';

const RABBITMQ_URL =
    process.env.RABBITMQ_URL || 'amqp://chat_admin:chat_password@localhost:5672/';

let connectionModel: ChannelModel | null = null;
let channel: Channel | null = null;

export const EXCHANGE_NAME = 'chat.events';
export const QUEUE_NAME = 'notifications';
export const DLX_EXCHANGE = 'chat.events.dlx';
export const DLQ_NAME = 'notifications.dlq';

export const connectRabbitMQ = async (): Promise<void> => {
    connectionModel = await amqplib.connect(RABBITMQ_URL);
    channel = await connectionModel.createChannel();

    // Main exchange
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // Dead letter exchange & queue
    await channel.assertExchange(DLX_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(DLQ_NAME, { durable: true });
    await channel.bindQueue(DLQ_NAME, DLX_EXCHANGE, '#');

    // Main notifications queue with DLX
    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': DLX_EXCHANGE,
            'x-dead-letter-routing-key': 'notification.dead',
        },
    });

    // Bind routing keys
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'message.new');
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'message.mention');
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'channel.invite');

    await channel.prefetch(10);

    logger.info('✅ Connected to RabbitMQ');

    connectionModel.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        connectionModel = null;
        channel = null;
    });
    connectionModel.on('error', (err: Error) => {
        logger.error('RabbitMQ connection error', { error: err.message });
    });
};

export const getRabbitChannel = (): Channel => {
    if (!channel) throw new Error('RabbitMQ channel not initialised');
    return channel;
};

export const isRabbitConnected = (): boolean => {
    return connectionModel !== null && channel !== null;
};

export const closeRabbitMQ = async (): Promise<void> => {
    await channel?.close();
    await connectionModel?.close();
    channel = null;
    connectionModel = null;
};
