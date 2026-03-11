// =============================================================================
// User Controller — getProfile, updateProfile, uploadAvatar
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
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

// ═══════════════════════════════════════════════════════════════════════════
// GET /workspaces — list workspaces the authenticated user belongs to
// ═══════════════════════════════════════════════════════════════════════════

export const getWorkspaces = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;

        const memberships = await prisma.workspaceMember.findMany({
            where: { userId },
            include: {
                workspace: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        displayName: true,
                                        avatarUrl: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const workspaces = memberships.map((m) => {
            const ws = m.workspace;
            // For DM workspaces, include members so the frontend can show the other person's name
            return {
                ...ws,
                members: ws.type === 'DM' ? ws.members.map((mem) => ({
                    id: mem.user.id,
                    displayName: mem.user.displayName,
                    avatarUrl: mem.user.avatarUrl,
                    email: mem.user.email,
                    role: mem.role,
                })) : undefined,
            };
        });
        sendSuccess(res, { workspaces });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces — create a new workspace
// ═══════════════════════════════════════════════════════════════════════════

export const createWorkspace = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { name } = req.body as { name: string };

        // Generate a URL-safe slug from the name
        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${baseSlug}-${Date.now().toString(36)}`;

        const workspace = await prisma.workspace.create({
            data: {
                name,
                slug,
                ownerId: userId,
                type: 'GROUP',
                members: {
                    create: {
                        userId,
                        role: 'OWNER',
                    },
                },
                channels: {
                    create: {
                        name: 'general',
                        description: 'General discussion',
                        type: 'PUBLIC',
                    },
                },
            },
        });

        logger.info(`Workspace created: ${workspace.id} by ${userId}`);
        sendSuccess(res, { workspace }, 201);
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /workspaces/:workspaceId — delete a workspace (owner only)
// Cascades to all channels and memberships
// ═══════════════════════════════════════════════════════════════════════════

export const deleteWorkspace = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { workspaceId } = req.params;

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace) {
            sendError(res, 'NOT_FOUND', 'Workspace not found', 404);
            return;
        }
        if (workspace.ownerId !== userId) {
            sendError(res, 'FORBIDDEN', 'Only the workspace owner can delete it', 403);
            return;
        }

        // Cascade: channels and memberships are deleted via DB foreign key CASCADE
        await prisma.workspace.delete({ where: { id: workspaceId } });

        logger.info(`Workspace ${workspaceId} deleted by owner ${userId}`);
        sendSuccess(res, { message: 'Workspace deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /workspaces/:workspaceId/channels — list channels in a workspace
// ═══════════════════════════════════════════════════════════════════════════

export const getChannels = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { workspaceId } = req.params;

        // Verify user is a member of this workspace
        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });

        if (!membership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        const channels = await prisma.channel.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'asc' },
        });

        sendSuccess(res, { channels });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces/:workspaceId/channels — create a channel
// ═══════════════════════════════════════════════════════════════════════════

export const createChannel = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { workspaceId } = req.params;
        const { name, description, type } = req.body as {
            name: string;
            description?: string;
            type?: 'PUBLIC' | 'PRIVATE';
        };

        // Only members can create channels
        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });

        if (!membership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        const channel = await prisma.channel.create({
            data: {
                name,
                description,
                workspaceId,
                type: type ?? 'PUBLIC',
            },
        });

        logger.info(`Channel created: ${channel.id} in workspace ${workspaceId}`);
        sendSuccess(res, { channel }, 201);
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /workspaces/:workspaceId/members — list members of a workspace
// ═══════════════════════════════════════════════════════════════════════════

export const getMembers = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { workspaceId } = req.params;

        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!membership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                        avatarUrl: true,
                        status: true,
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });

        sendSuccess(res, { members: members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })) });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces/:workspaceId/members — invite a user by email
// ═══════════════════════════════════════════════════════════════════════════

export const inviteMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const inviterId = req.user!.id;
        const { workspaceId } = req.params;
        const { email } = req.body as { email: string };

        // Only members can invite
        const inviterMembership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: inviterId, workspaceId } },
        });
        if (!inviterMembership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        // Find the user to invite
        const invitee = await prisma.user.findUnique({ where: { email } });
        if (!invitee) {
            sendError(res, 'USER_NOT_FOUND', 'No account found with that email address', 404);
            return;
        }

        // Check if already a member
        const existing = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: invitee.id, workspaceId } },
        });
        if (existing) {
            sendError(res, 'ALREADY_MEMBER', 'This user is already a member of the workspace', 409);
            return;
        }

        const member = await prisma.workspaceMember.create({
            data: { userId: invitee.id, workspaceId, role: 'MEMBER' },
        });

        logger.info(`User ${invitee.id} invited to workspace ${workspaceId} by ${inviterId}`);
        sendSuccess(res, {
            member: {
                id: invitee.id,
                email: invitee.email,
                displayName: invitee.displayName,
                avatarUrl: invitee.avatarUrl,
                role: member.role,
                joinedAt: member.joinedAt,
            },
        }, 201);
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /workspaces/:workspaceId/members/:userId — remove a member
// Only OWNER/ADMIN can remove others; members can remove themselves (leave)
// ═══════════════════════════════════════════════════════════════════════════

export const removeMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const requesterId = req.user!.id;
        const { workspaceId, userId } = req.params;

        const requesterMembership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: requesterId, workspaceId } },
        });
        if (!requesterMembership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        // Only OWNER/ADMIN can remove others; anyone can remove themselves
        const isSelf = requesterId === userId;
        const canManage = ['OWNER', 'ADMIN'].includes(requesterMembership.role);
        if (!isSelf && !canManage) {
            sendError(res, 'FORBIDDEN', 'Only workspace owners and admins can remove members', 403);
            return;
        }

        // Prevent owner from leaving their own workspace
        if (isSelf && requesterMembership.role === 'OWNER') {
            sendError(res, 'FORBIDDEN', 'Workspace owner cannot leave. Transfer ownership first.', 403);
            return;
        }

        const target = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!target) {
            sendError(res, 'NOT_FOUND', 'Member not found in this workspace', 404);
            return;
        }

        await prisma.workspaceMember.delete({
            where: { userId_workspaceId: { userId, workspaceId } },
        });

        logger.info(`User ${userId} removed from workspace ${workspaceId} by ${requesterId}`);
        sendSuccess(res, { message: 'Member removed successfully' });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /workspaces/:workspaceId/channels/:channelId — delete a channel
// Only OWNER or ADMIN can delete a channel
// ═══════════════════════════════════════════════════════════════════════════

export const deleteChannel = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { workspaceId, channelId } = req.params;

        // Only OWNER/ADMIN can delete channels
        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!membership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }
        if (!['OWNER', 'ADMIN'].includes(membership.role)) {
            sendError(res, 'FORBIDDEN', 'Only workspace owners and admins can delete channels', 403);
            return;
        }

        const channel = await prisma.channel.findFirst({
            where: { id: channelId, workspaceId },
        });
        if (!channel) {
            sendError(res, 'NOT_FOUND', 'Channel not found', 404);
            return;
        }

        await prisma.channel.delete({ where: { id: channelId } });

        // Delete all messages for this channel in the messaging service (MongoDB)
        const msgServiceUrl = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3002';
        try {
            await fetch(`${msgServiceUrl}/api/messages/channel/${channelId}`, { method: 'DELETE' });
        } catch (fetchErr) {
            logger.warn(`Failed to delete messages for channel ${channelId}`, { error: (fetchErr as Error).message });
        }

        logger.info(`Channel ${channelId} deleted from workspace ${workspaceId} by ${userId}`);
        sendSuccess(res, { message: 'Channel deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /workspaces/:workspaceId/invite-code — get the workspace invite code
// ═══════════════════════════════════════════════════════════════════════════

export const getInviteCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { workspaceId } = req.params;

        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!membership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { inviteCode: true },
        });

        sendSuccess(res, { inviteCode: workspace!.inviteCode });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces/:workspaceId/invite-code — regenerate the workspace invite code
// ═══════════════════════════════════════════════════════════════════════════

export const regenerateInviteCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { workspaceId } = req.params;

        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
            sendError(res, 'FORBIDDEN', 'Only owners and admins can regenerate the invite code', 403);
            return;
        }

        const workspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { inviteCode: uuidv4() },
            select: { inviteCode: true },
        });

        logger.info(`Invite code regenerated for workspace ${workspaceId} by ${userId}`);
        sendSuccess(res, { inviteCode: workspace.inviteCode });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces/join — join a workspace by invite code
// ═══════════════════════════════════════════════════════════════════════════

export const joinByCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { inviteCode } = req.body as { inviteCode: string };

        const workspace = await prisma.workspace.findUnique({
            where: { inviteCode },
        });
        if (!workspace) {
            sendError(res, 'INVALID_CODE', 'Invalid or expired invite code', 404);
            return;
        }

        // Check if already a member
        const existing = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: workspace.id } },
        });
        if (existing) {
            sendError(res, 'ALREADY_MEMBER', 'You are already a member of this workspace', 409);
            return;
        }

        // Enforce maxMembers for DM workspaces
        if (workspace.maxMembers) {
            const memberCount = await prisma.workspaceMember.count({
                where: { workspaceId: workspace.id },
            });
            if (memberCount >= workspace.maxMembers) {
                sendError(res, 'WORKSPACE_FULL', 'This chat is full (max members reached)', 403);
                return;
            }
        }

        await prisma.workspaceMember.create({
            data: { userId, workspaceId: workspace.id, role: 'MEMBER' },
        });

        logger.info(`User ${userId} joined workspace ${workspace.id} via invite code`);
        sendSuccess(res, { workspace }, 201);
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces/dm — create a 1-on-1 DM workspace (generates invite code)
// ═══════════════════════════════════════════════════════════════════════════

export const createDm = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user!.id;

        const dmName = `DM-${Date.now().toString(36)}`;
        const slug = `dm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

        const workspace = await prisma.workspace.create({
            data: {
                name: dmName,
                slug,
                ownerId: userId,
                type: 'DM',
                maxMembers: 2,
                members: {
                    create: {
                        userId,
                        role: 'OWNER',
                    },
                },
                channels: {
                    create: {
                        name: 'dm',
                        type: 'DIRECT',
                    },
                },
            },
        });

        logger.info(`DM workspace created: ${workspace.id} by ${userId}`);
        sendSuccess(res, { workspace, inviteCode: workspace.inviteCode }, 201);
    } catch (err) {
        next(err);
    }
};
