// =============================================================================
// User Controller — getProfile, updateProfile, uploadAvatar
// =============================================================================

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { AppError } = require('../utils/appError');
const { logger } = require('../utils/logger');
const { Message } = require('../models/message.model');
const { decrypt } = require('../services/encryption.service');

const prisma = new PrismaClient();

/** Strip password and providerId before sending */
const sanitiseUser = (user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    description: user.description,
    dob: user.dob,
    gender: user.gender,
    status: user.status,
    provider: user.provider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /profile/:userId — view any user's public profile
// ═══════════════════════════════════════════════════════════════════════════

const getProfile = async (req, res, next) => {
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

const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { displayName, avatarUrl, description, dob, gender } = req.body;

        logger.info(`Profile update request for user ${userId}`, {
            hasDisplayName: !!displayName,
            hasAvatarUrl: !!avatarUrl,
            avatarUrlLength: avatarUrl?.length || 0,
            hasDescription: !!description,
            hasDob: !!dob,
            hasGender: !!gender,
        });

        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (description !== undefined) updateData.description = description;
        if (dob !== undefined) updateData.dob = dob;
        if (gender !== undefined) updateData.gender = gender;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        logger.info(`Profile updated: ${userId}`);

        sendSuccess(res, { user: sanitiseUser(updatedUser) });
    } catch (err) {
        logger.error('Profile update failed', { error: err.message, stack: err.stack });
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /profile/avatar — update avatar URL
// ═══════════════════════════════════════════════════════════════════════════

const uploadAvatar = async (req, res, next) => {
    try {
        const userId = req.user.id;
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

const getWorkspaces = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const memberships = await prisma.workspaceMember.findMany({
            where: { userId },
            include: {
                workspace: {
                    include: {
                        channels: {
                            select: { id: true, name: true, type: true },
                        },
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

        const workspaces = await Promise.all(
            memberships.map(async (m) => {
                const ws = m.workspace;
                const channelIds = (ws.channels || []).map((c) => c.id);

                let lastMessage = null;
                if (channelIds.length > 0) {
                    try {
                        const latestDoc = await Message.findOne({
                            channelId: { $in: channelIds },
                            deleted: false,
                        })
                            .sort({ _id: -1 })
                            .lean();

                        if (latestDoc) {
                            let decryptedContent = latestDoc.content;
                            try {
                                decryptedContent = await decrypt(latestDoc.content);
                            } catch (decErr) {
                                // fallback to raw content if decryption error
                            }

                            lastMessage = {
                                id: latestDoc._id.toString(),
                                channelId: latestDoc.channelId,
                                senderId: latestDoc.senderId,
                                senderName: latestDoc.senderName,
                                content: decryptedContent,
                                createdAt: latestDoc.createdAt || latestDoc.created_at || new Date().toISOString(),
                            };
                        }
                    } catch (msgErr) {
                        logger.warn(`Failed to fetch last message for workspace ${ws.id}: ${msgErr.message}`);
                    }
                }

                return {
                    ...ws,
                    lastMessage,
                    members: (ws.members || []).map((mem) => ({
                        id: mem.user.id,
                        displayName: mem.user.displayName,
                        avatarUrl: mem.user.avatarUrl,
                        email: mem.user.email,
                        role: mem.role,
                    })),
                };
            }),
        );

        sendSuccess(res, { workspaces });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /workspaces/:workspaceId — update workspace name and/or avatarUrl
// ═══════════════════════════════════════════════════════════════════════════

const updateWorkspace = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { workspaceId } = req.params;
        const { name, avatarUrl } = req.body;

        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
        });

        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
            sendError(res, 'FORBIDDEN', 'Only workspace owners and admins can update group details', 403);
            return;
        }

        const data = {};
        if (name !== undefined) data.name = name.trim();
        if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data,
            include: {
                channels: {
                    select: { id: true, name: true, type: true },
                },
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
        });

        logger.info(`Workspace updated: ${workspaceId} by user ${userId}`);

        sendSuccess(res, {
            workspace: {
                ...updated,
                members: (updated.members || []).map((mem) => ({
                    id: mem.user.id,
                    displayName: mem.user.displayName,
                    avatarUrl: mem.user.avatarUrl,
                    email: mem.user.email,
                    role: mem.role,
                })),
            },
        });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces — create a new workspace
// ═══════════════════════════════════════════════════════════════════════════

const createWorkspace = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;

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
// ═══════════════════════════════════════════════════════════════════════════

const deleteWorkspace = async (req, res, next) => {
    try {
        const userId = req.user.id;
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

const getChannels = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { workspaceId } = req.params;

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

const createChannel = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { workspaceId } = req.params;
        const { name, description, type } = req.body;

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

const getMembers = async (req, res, next) => {
    try {
        const userId = req.user.id;
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

const inviteMember = async (req, res, next) => {
    try {
        const inviterId = req.user.id;
        const { workspaceId } = req.params;
        const { email } = req.body;

        const inviterMembership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: inviterId, workspaceId } },
        });
        if (!inviterMembership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        const invitee = await prisma.user.findUnique({ where: { email } });
        if (!invitee) {
            sendError(res, 'USER_NOT_FOUND', 'No account found with that email address', 404);
            return;
        }

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
// ═══════════════════════════════════════════════════════════════════════════

const removeMember = async (req, res, next) => {
    try {
        const requesterId = req.user.id;
        const { workspaceId, userId } = req.params;

        const requesterMembership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: requesterId, workspaceId } },
        });
        if (!requesterMembership) {
            sendError(res, 'FORBIDDEN', 'You are not a member of this workspace', 403);
            return;
        }

        const isSelf = requesterId === userId;
        const canManage = ['OWNER', 'ADMIN'].includes(requesterMembership.role);
        if (!isSelf && !canManage) {
            sendError(res, 'FORBIDDEN', 'Only workspace owners and admins can remove members', 403);
            return;
        }

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
// ═══════════════════════════════════════════════════════════════════════════

const deleteChannel = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { workspaceId, channelId } = req.params;

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

        const msgServiceUrl = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3002';
        try {
            await fetch(`${msgServiceUrl}/api/messages/channel/${channelId}`, { method: 'DELETE' });
        } catch (fetchErr) {
            logger.warn(`Failed to delete messages for channel ${channelId}`, { error: fetchErr.message });
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

const getInviteCode = async (req, res, next) => {
    try {
        const userId = req.user.id;
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

        sendSuccess(res, { inviteCode: workspace.inviteCode });
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// POST /workspaces/:workspaceId/invite-code — regenerate the workspace invite code
// ═══════════════════════════════════════════════════════════════════════════

const regenerateInviteCode = async (req, res, next) => {
    try {
        const userId = req.user.id;
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

const joinByCode = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { inviteCode } = req.body;

        const workspace = await prisma.workspace.findUnique({
            where: { inviteCode },
        });
        if (!workspace) {
            sendError(res, 'INVALID_CODE', 'Invalid or expired invite code', 404);
            return;
        }

        const existing = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: workspace.id } },
        });
        if (existing) {
            sendError(res, 'ALREADY_MEMBER', 'You are already a member of this workspace', 409);
            return;
        }

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
// POST /workspaces/dm — create a 1-on-1 DM workspace
// ═══════════════════════════════════════════════════════════════════════════

const createDm = async (req, res, next) => {
    try {
        const userId = req.user.id;

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

module.exports = {
    getProfile,
    updateProfile,
    uploadAvatar,
    getWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getChannels,
    createChannel,
    deleteChannel,
    getMembers,
    inviteMember,
    removeMember,
    getInviteCode,
    regenerateInviteCode,
    joinByCode,
    createDm,
};
