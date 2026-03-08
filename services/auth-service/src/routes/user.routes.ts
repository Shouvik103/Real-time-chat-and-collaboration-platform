// =============================================================================
// User Routes — profile operations
// =============================================================================

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import {
    updateProfileSchema,
    getProfileSchema,
    uploadAvatarSchema,
} from '../validators/user.validator';
import {
    getProfile,
    updateProfile,
    uploadAvatar,
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

export default router;
