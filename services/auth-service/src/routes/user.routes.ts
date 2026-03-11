// =============================================================================
// User Routes — profile operations and workspace/channel management
// =============================================================================

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import {
    updateProfileSchema,
    getProfileSchema,
    uploadAvatarSchema,
    createWorkspaceSchema,
    deleteWorkspaceSchema,
    workspaceParamSchema,
    createChannelSchema,
    deleteChannelSchema,
    inviteMemberSchema,
    removeMemberSchema,
    joinByCodeSchema,
} from '../validators/user.validator';
import {
    getProfile,
    updateProfile,
    uploadAvatar,
    getWorkspaces,
    createWorkspace,
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
} from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /profile/:userId — view any user's profile
router.get('/profile/:userId', validate(getProfileSchema), getProfile);

// PATCH /profile — update the authenticated user's own profile
router.patch('/profile', validate(updateProfileSchema), updateProfile);

// PATCH /profile/avatar — update avatar URL
router.patch('/profile/avatar', validate(uploadAvatarSchema), uploadAvatar);

// Workspace routes
router.get('/workspaces', getWorkspaces);
router.post('/workspaces', validate(createWorkspaceSchema), createWorkspace);
router.post('/workspaces/dm', createDm);
router.post('/workspaces/join', validate(joinByCodeSchema), joinByCode);
router.delete('/workspaces/:workspaceId', validate(deleteWorkspaceSchema), deleteWorkspace);
router.get('/workspaces/:workspaceId/channels', validate(workspaceParamSchema), getChannels);
router.post('/workspaces/:workspaceId/channels', validate(createChannelSchema), createChannel);
router.delete('/workspaces/:workspaceId/channels/:channelId', validate(deleteChannelSchema), deleteChannel);

// Invite code routes
router.get('/workspaces/:workspaceId/invite-code', validate(workspaceParamSchema), getInviteCode);
router.post('/workspaces/:workspaceId/invite-code', validate(workspaceParamSchema), regenerateInviteCode);

// Member routes
router.get('/workspaces/:workspaceId/members', validate(workspaceParamSchema), getMembers);
router.post('/workspaces/:workspaceId/members', validate(inviteMemberSchema), inviteMember);
router.delete('/workspaces/:workspaceId/members/:userId', validate(removeMemberSchema), removeMember);

export default router;
