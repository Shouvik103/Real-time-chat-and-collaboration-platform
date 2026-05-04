import api from './axios';
import type { Notification } from '@/types';

export const notificationApi = {
  getNotifications: (page = 1, limit = 20) =>
    api.get<{ data: { notifications: Notification[]; total: number } }>(
      '/api/notify/notifications',
      { params: { page, limit, _t: Date.now() } },
    ),

  getUnreadCount: () =>
    api.get<{ data: { unreadCount: number; channelCounts: Record<string, number>; workspaceCounts: Record<string, number> } }>('/api/notify/notifications/unread-count'),

  markRead: (notificationId: string) =>
    api.patch(`/api/notify/notifications/${notificationId}/read`),

  markChannelRead: (channelId: string) =>
    api.patch(`/api/notify/notifications/channel/${channelId}/read`),

  markAllRead: () =>
    api.patch('/api/notify/notifications/read-all'),
};
