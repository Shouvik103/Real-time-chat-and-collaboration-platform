import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
    notificationIdParamSchema,
    notificationsQuerySchema,
    registerTokenSchema,
    unregisterTokenParamSchema,
    updatePreferencesSchema,
} from '../validators/notification.validator';
import {
    getNotificationsHandler,
    markReadHandler,
    markAllReadHandler,
    markChannelReadHandler,
    getUnreadCountHandler,
    registerTokenHandler,
    unregisterTokenHandler,
    getPreferencesHandler,
    updatePreferencesHandler,
} from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);

// Notifications
router.get('/notifications', validate(notificationsQuerySchema), getNotificationsHandler);
router.get('/notifications/unread-count', getUnreadCountHandler);
router.patch('/notifications/read-all', markAllReadHandler);
router.patch('/notifications/channel/:channelId/read', markChannelReadHandler);
router.patch('/notifications/:id/read', validate(notificationIdParamSchema), markReadHandler);

// Device tokens
router.post('/tokens', validate(registerTokenSchema), registerTokenHandler);
router.delete('/tokens/:token', validate(unregisterTokenParamSchema), unregisterTokenHandler);

// Preferences
router.get('/preferences', getPreferencesHandler);
router.put('/preferences', validate(updatePreferencesSchema), updatePreferencesHandler);

export default router;
