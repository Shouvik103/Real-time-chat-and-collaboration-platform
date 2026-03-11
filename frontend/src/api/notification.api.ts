import api from './axios';
import type { Notification } from '@/types';

export const notificationApi = {
  getNotifications: (page = 1, limit = 20) =>
    api.get<{ data: { notifications: Notification[]; total: number } }>(
      '/api/notify/notifications',
      { params: { page, limit } },
    ),

  getUnreadCount: () =>
    api.get<{ data: { count: number } }>('/api/notify/notifications/unread-count'),

  markRead: (notificationId: string) =>
    api.patch(`/api/notify/notifications/${notificationId}`, { isRead: true }),

  markAllRead: () =>
    api.patch('/api/notify/notifications', { isRead: true }),
};
