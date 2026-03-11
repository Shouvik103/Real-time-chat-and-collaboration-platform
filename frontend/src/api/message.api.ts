import api from './axios';
import type { Message, MessagesPage } from '@/types';

export const messageApi = {
  getMessages: (channelId: string, cursor?: string, limit = 30) =>
    api.get<{ data: MessagesPage }>(`/api/messages/${channelId}`, {
      params: { cursor, limit },
    }),

  editMessage: (messageId: string, content: string) =>
    api.patch<{ data: { message: Message } }>(`/api/messages/${messageId}`, {
      content,
    }),

  deleteMessage: (messageId: string) =>
    api.delete(`/api/messages/${messageId}`),
};
