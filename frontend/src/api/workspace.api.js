import api from "./axios";
export const workspaceApi = {
  getWorkspaces: () => api.get("/api/users/workspaces"),
  createWorkspace: (name) => api.post("/api/users/workspaces", { name }),
  updateWorkspace: (workspaceId, data) => api.patch(`/api/users/workspaces/${workspaceId}`, data),
  createDm: () => api.post("/api/users/workspaces/dm"),
  deleteWorkspace: (workspaceId) => api.delete(`/api/users/workspaces/${workspaceId}`),
  getChannels: (workspaceId) => api.get(
    `/api/users/workspaces/${workspaceId}/channels`
  ),
  createChannel: (workspaceId, body) => api.post(
    `/api/users/workspaces/${workspaceId}/channels`,
    body
  ),
  deleteChannel: (workspaceId, channelId) => api.delete(`/api/users/workspaces/${workspaceId}/channels/${channelId}`),
  getMembers: (workspaceId) => api.get(
    `/api/users/workspaces/${workspaceId}/members`
  ),
  inviteMember: (workspaceId, email) => api.post(
    `/api/users/workspaces/${workspaceId}/members`,
    { email }
  ),
  removeMember: (workspaceId, userId) => api.delete(`/api/users/workspaces/${workspaceId}/members/${userId}`),
  getInviteCode: (workspaceId) => api.get(
    `/api/users/workspaces/${workspaceId}/invite-code`
  ),
  regenerateInviteCode: (workspaceId) => api.post(
    `/api/users/workspaces/${workspaceId}/invite-code`
  ),
  joinByCode: (inviteCode) => api.post(
    "/api/users/workspaces/join",
    { inviteCode }
  )
};
