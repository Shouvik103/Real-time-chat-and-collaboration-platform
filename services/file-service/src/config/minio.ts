import * as Minio from 'minio';
import { logger } from '../utils/logger';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_API_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER || 'minio_admin';
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD || 'CHANGE_ME_minio_password';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const BUCKET_NAME = process.env.MINIO_BUCKET || 'chat-files';

export const minioClient = new Minio.Client({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
});

export const MINIO_BUCKET = BUCKET_NAME;

export const ensureBucket = async (): Promise<void> => {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
        await minioClient.makeBucket(BUCKET_NAME);
        logger.info(`✅ Created MinIO bucket: ${BUCKET_NAME}`);
    } else {
        logger.info(`✅ MinIO bucket exists: ${BUCKET_NAME}`);
    }
};
