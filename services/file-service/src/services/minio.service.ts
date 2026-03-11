import { Readable } from 'stream';
import { minioClient, MINIO_BUCKET } from '../config/minio';
import { logger } from '../utils/logger';

export const uploadToMinio = async (
    objectName: string,
    buffer: Buffer,
    mimeType: string,
): Promise<void> => {
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
        'Content-Type': mimeType,
    });
    logger.info('File uploaded to MinIO', { objectName, size: buffer.length });
};

export const downloadFromMinio = async (objectName: string): Promise<Readable> => {
    const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
    return stream;
};

export const deleteFromMinio = async (objectName: string): Promise<void> => {
    await minioClient.removeObject(MINIO_BUCKET, objectName);
    logger.info('File deleted from MinIO', { objectName });
};

export const getPresignedUrl = async (objectName: string, expirySeconds = 900): Promise<string> => {
    const url = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, expirySeconds);
    return url;
};

export const statObject = async (objectName: string) => {
    return minioClient.statObject(MINIO_BUCKET, objectName);
};
