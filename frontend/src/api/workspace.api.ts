import api from './axios';
import type { Channel, Workspace } from '@/types';

export interface WorkspaceMember {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

export const workspaceApi = {
  getWorkspaces: () =>
    api.get<{ data: { workspaces: Workspace[] } }>('/api/users/workspaces'),

  createWorkspace: (name: string) =>
    api.post<{ data: { workspace: Workspace } }>('/api/users/workspaces', { name }),

  createDm: () =>
    api.post<{ data: { workspace: Workspace; inviteCode: string } }>('/api/users/workspaces/dm'),

  deleteWorkspace: (workspaceId: string) =>
    api.delete(`/api/users/workspaces/${workspaceId}`),

  getChannels: (workspaceId: string) =>
    api.get<{ data: { channels: Channel[] } }>(
      `/api/users/workspaces/${workspaceId}/channels`,
    ),

  createChannel: (
    workspaceId: string,
    body: { name: string; description?: string; type?: 'PUBLIC' | 'PRIVATE' },
  ) =>
    api.post<{ data: { channel: Channel } }>(
      `/api/users/workspaces/${workspaceId}/channels`,
      body,
    ),

  deleteChannel: (workspaceId: string, channelId: string) =>
    api.delete(`/api/users/workspaces/${workspaceId}/channels/${channelId}`),

  getMembers: (workspaceId: string) =>
    api.get<{ data: { members: WorkspaceMember[] } }>(
      `/api/users/workspaces/${workspaceId}/members`,
    ),

  inviteMember: (workspaceId: string, email: string) =>
    api.post<{ data: { member: WorkspaceMember } }>(
      `/api/users/workspaces/${workspaceId}/members`,
      { email },
    ),

  removeMember: (workspaceId: string, userId: string) =>
    api.delete(`/api/users/workspaces/${workspaceId}/members/${userId}`),

  getInviteCode: (workspaceId: string) =>
    api.get<{ data: { inviteCode: string } }>(
      `/api/users/workspaces/${workspaceId}/invite-code`,
    ),

  regenerateInviteCode: (workspaceId: string) =>
    api.post<{ data: { inviteCode: string } }>(
      `/api/users/workspaces/${workspaceId}/invite-code`,
    ),

  joinByCode: (inviteCode: string) =>
    api.post<{ data: { workspace: Workspace } }>(
      '/api/users/workspaces/join',
      { inviteCode },
    ),
};
