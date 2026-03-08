import amqplib, { ChannelModel, Channel } from 'amqplib';
import { logger } from '../utils/logger';

const RABBITMQ_URL =
    process.env.RABBITMQ_URL || 'amqp://chat_admin:chat_password@localhost:5672/';

let connectionModel: ChannelModel | null = null;
let channel: Channel | null = null;

export const EXCHANGE_NAME = 'chat.events';

export const connectRabbitMQ = async (): Promise<void> => {
    connectionModel = await amqplib.connect(RABBITMQ_URL);
    channel = await connectionModel.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    logger.info('Connected to RabbitMQ');

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

export const closeRabbitMQ = async (): Promise<void> => {
    await channel?.close();
    await connectionModel?.close();
    channel = null;
    connectionModel = null;
};
