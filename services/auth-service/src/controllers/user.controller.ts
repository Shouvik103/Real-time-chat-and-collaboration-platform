// =============================================================================
// User Controller — getProfile, updateProfile, uploadAvatar
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/** Strip password and providerId before sending */
const sanitiseUser = (user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
    provider: string;
    createdAt: Date;
    updatedAt: Date;
}) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
    provider: user.provider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /profile/:userId — view any user's public profile
// ═══════════════════════════════════════════════════════════════════════════

export const getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
            return;
        }

        sendSuccess(res, { user: sanitiseUser(user) });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /profile — update the authenticated user's profile
// ═══════════════════════════════════════════════════════════════════════════

export const updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { displayName, avatarUrl } = req.body;

        const updateData: Record<string, string> = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        logger.info(`Profile updated: ${userId}`);

        sendSuccess(res, { user: sanitiseUser(updatedUser) });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /profile/avatar — update avatar URL
// The actual file upload is handled by the File Service; this endpoint
// just persists the resulting URL in the user record.
// ═══════════════════════════════════════════════════════════════════════════

export const uploadAvatar = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { avatarUrl } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
        });

        logger.info(`Avatar updated for user: ${userId}`);

        sendSuccess(res, {
            user: sanitiseUser(updatedUser),
            avatarUrl: updatedUser.avatarUrl,
        });
    } catch (err) {
        next(err);
    }
};
