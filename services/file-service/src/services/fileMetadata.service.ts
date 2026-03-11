import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface CreateFileInput {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    bucket: string;
    path: string;
    thumbnailPath?: string;
    uploaderId: string;
    channelId?: string;
    messageId?: string;
    isPublic?: boolean;
}

export const saveFileMetadata = async (input: CreateFileInput) => {
    const file = await prisma.file.create({ data: input });
    logger.info('File metadata saved', { fileId: file.id, originalName: file.originalName });
    return file;
};

export const getFileById = async (fileId: string) => {
    return prisma.file.findUnique({ where: { id: fileId } });
};

export const getFilesByChannel = async (channelId: string, cursor?: string, limit = 20) => {
    const take = Math.min(limit, 100);
    const files = await prisma.file.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = files.length > take;
    const results = hasMore ? files.slice(0, take) : files;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    return { files: results, nextCursor, hasMore };
};

export const deleteFileMetadata = async (fileId: string) => {
    const file = await prisma.file.delete({ where: { id: fileId } });
    logger.info('File metadata deleted', { fileId: file.id });
    return file;
};

export const prismaClient = prisma;
