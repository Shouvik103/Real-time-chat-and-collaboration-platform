import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { uploadToMinio, downloadFromMinio, deleteFromMinio, getPresignedUrl } from '../services/minio.service';
import { saveFileMetadata, getFileById, getFilesByChannel, deleteFileMetadata } from '../services/fileMetadata.service';
import { scanBuffer } from '../services/virusScan.service';
import { redis } from '../config/redis';
import { MINIO_BUCKET } from '../config/minio';

const PRESIGNED_CACHE_TTL = 14 * 60; // 14 minutes

const buildObjectPath = (storedName: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `uploads/${year}/${month}/${storedName}`;
};

const isImageMime = (mime: string): boolean => mime.startsWith('image/') && mime !== 'image/svg+xml';

// ──── Upload File ────────────────────────────────────────────────────────────
export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) {
            sendError(res, 'NO_FILE', 'No file provided in request', 400);
            return;
        }
        if (!req.user) {
            sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
            return;
        }

        const { buffer, originalname, mimetype, size } = req.file;
        const { channelId, messageId, isPublic } = req.body;

        // Virus scan
        const scanResult = await scanBuffer(buffer, originalname);
        if (!scanResult.clean) {
            sendError(res, 'VIRUS_DETECTED', `File rejected: ${scanResult.virus || 'malware detected'}`, 422);
            return;
        }

        // Generate stored name & path
        const ext = path.extname(originalname) || '';
        const uuid = uuidv4();
        const storedName = `${uuid}${ext}`;
        const objectPath = buildObjectPath(storedName);

        // Upload to MinIO
        await uploadToMinio(objectPath, buffer, mimetype);

        // Generate thumbnail for images
        let thumbnailPath: string | undefined;
        if (isImageMime(mimetype)) {
            try {
                const thumbBuffer = await sharp(buffer)
                    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                thumbnailPath = buildObjectPath(`${uuid}_thumb.webp`);
                await uploadToMinio(thumbnailPath, thumbBuffer, 'image/webp');
            } catch (thumbErr) {
                logger.warn('Thumbnail generation failed', { error: (thumbErr as Error).message });
            }
        }

        // Save metadata
        const file = await saveFileMetadata({
            originalName: originalname,
            storedName,
            mimeType: mimetype,
            size,
            bucket: MINIO_BUCKET,
            path: objectPath,
            thumbnailPath,
            uploaderId: req.user.id,
            channelId,
            messageId,
            isPublic: isPublic === true || isPublic === 'true',
        });

        logger.info('File uploaded successfully', { fileId: file.id, originalName: originalname, size });

        sendSuccess(res, {
            fileId: file.id,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            thumbnailPath: file.thumbnailPath || null,
            createdAt: file.createdAt,
        }, 201);
    } catch (err) {
        next(err);
    }
};

// ──── Get File Info ──────────────────────────────────────────────────────────
export const getFileInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fileId } = req.params;
        const file = await getFileById(fileId);
        if (!file) {
            sendError(res, 'NOT_FOUND', 'File not found', 404);
            return;
        }

        sendSuccess(res, {
            fileId: file.id,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            uploaderId: file.uploaderId,
            channelId: file.channelId,
            messageId: file.messageId,
            isPublic: file.isPublic,
            thumbnailPath: file.thumbnailPath,
            createdAt: file.createdAt,
        });
    } catch (err) {
        next(err);
    }
};

// ──── Download File ──────────────────────────────────────────────────────────
export const downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fileId } = req.params;
        const file = await getFileById(fileId);
        if (!file) {
            sendError(res, 'NOT_FOUND', 'File not found', 404);
            return;
        }

        const stream = await downloadFromMinio(file.path);

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader('Content-Length', file.size);

        stream.pipe(res);
    } catch (err) {
        next(err);
    }
};

// ──── Get Presigned URL ──────────────────────────────────────────────────────
export const getPresignedUrlHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { fileId } = req.params;
        const file = await getFileById(fileId);
        if (!file) {
            sendError(res, 'NOT_FOUND', 'File not found', 404);
            return;
        }

        // Check Redis cache
        const cacheKey = `presigned:${fileId}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            sendSuccess(res, { url: cached, cached: true });
            return;
        }

        const url = await getPresignedUrl(file.path, 900); // 15 min
        await redis.setex(cacheKey, PRESIGNED_CACHE_TTL, url);

        sendSuccess(res, { url, cached: false });
    } catch (err) {
        next(err);
    }
};

// ──── Delete File ────────────────────────────────────────────────────────────
export const deleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
            return;
        }

        const { fileId } = req.params;
        const file = await getFileById(fileId);
        if (!file) {
            sendError(res, 'NOT_FOUND', 'File not found', 404);
            return;
        }

        if (file.uploaderId !== req.user.id) {
            sendError(res, 'FORBIDDEN', 'Only the uploader can delete this file', 403);
            return;
        }

        // Delete from MinIO
        await deleteFromMinio(file.path);
        if (file.thumbnailPath) {
            await deleteFromMinio(file.thumbnailPath);
        }

        // Delete metadata
        await deleteFileMetadata(fileId);

        // Clear presigned URL cache
        await redis.del(`presigned:${fileId}`);

        logger.info('File deleted', { fileId, originalName: file.originalName });
        sendSuccess(res, { fileId, deleted: true });
    } catch (err) {
        next(err);
    }
};

// ──── List Channel Files ─────────────────────────────────────────────────────
export const getChannelFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { channelId } = req.params;
        const cursor = req.query.cursor as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

        const result = await getFilesByChannel(channelId, cursor, limit);

        sendSuccess(res, result);
    } catch (err) {
        next(err);
    }
};
