// =============================================================================
// Shared TypeScript types for the chat platform frontend
// =============================================================================

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  description: string | null;
  dob: string | null;
  gender: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

// ─── Workspace & Channels ────────────────────────────────────────────────────

export type WorkspaceType = 'GROUP' | 'DM';

export interface WorkspaceMemberInfo {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  email: string;
  role: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  inviteCode?: string;
  ownerId: string;
  type: WorkspaceType;
  maxMembers?: number | null;
  members?: WorkspaceMemberInfo[];
  createdAt: string;
  updatedAt: string;
}

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DIRECT';

export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  type: ChannelType;
  topic?: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface Reaction {
  emoji: string;
  userId: string;
}

export type MessageType = 'text' | 'image' | 'file';

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  type: MessageType;
  edited: boolean;
  deleted: boolean;
  reactions: Reaction[];
  attachments?: FileAttachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface FileAttachment {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Files ───────────────────────────────────────────────────────────────────

export interface FileRecord {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploaderId: string;
  channelId?: string;
  thumbnailKey?: string;
  createdAt: string;
}

export interface PresignedUrlResponse {
  url: string;
  expiresIn: number;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

// ─── Socket.IO Events ────────────────────────────────────────────────────────

export interface TypingEvent {
  userId: string;
  userName: string;
  channelId: string;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline';
  displayName: string;
}

export interface OnlineUser {
  userId: string;
  displayName: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
