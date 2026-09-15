import api from "./axios";
export const messageApi = {
  getMessages: (channelId, cursor, limit = 30) => api.get(`/api/messages/${channelId}`, {
    params: { cursor, limit }
  }),
  editMessage: (messageId, content) => api.patch(`/api/messages/${messageId}`, {
    content
  }),
  deleteMessage: (messageId) => api.delete(`/api/messages/${messageId}`)
};
