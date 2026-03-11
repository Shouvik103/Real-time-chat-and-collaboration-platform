import { create } from 'zustand';
import type { Channel, Message, OnlineUser, TypingEvent, Workspace } from '@/types';

interface ChatState {
  activeWorkspace: Workspace | null;
  activeChannelId: string | null;
  workspaces: Workspace[];
  channels: Channel[];
  /** Map of channelId → ordered messages (oldest first) */
  messages: Record<string, Message[]>;
  onlineUsers: OnlineUser[];
  /** Map of channelId → list of currently-typing users */
  typingUsers: Record<string, TypingEvent[]>;

  // Workspace / channel selection
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (channelId: string) => void;

  // Message management
  setMessages: (channelId: string, messages: Message[]) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;

  // Presence
  setOnlineUsers: (users: OnlineUser[]) => void;
  addOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;

  // Typing
  addTypingUser: (event: TypingEvent) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  activeWorkspace: null,
  activeChannelId: null,
  workspaces: [],
  channels: [],
  messages: {},
  onlineUsers: [],
  typingUsers: {},

  setWorkspaces: (workspaces) => set({ workspaces }),

  setActiveWorkspace: (workspace) =>
    set((state) => {
      // Skip if already the active workspace (prevent clearing channels on re-click)
      if (state.activeWorkspace?.id === workspace.id) return state;
      return { activeWorkspace: workspace, channels: [], activeChannelId: null };
    }),

  setChannels: (channels) => set({ channels }),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

  setMessages: (channelId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [channelId]: messages },
    })),

  prependMessages: (channelId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...messages, ...(state.messages[channelId] ?? [])],
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.channelId] ?? [];
      // Avoid duplicate IDs
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [message.channelId]: [...existing, message],
        },
      };
    }),

  updateMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.channelId] ?? [];
      return {
        messages: {
          ...state.messages,
          [message.channelId]: existing.map((m) =>
            m.id === message.id ? message : m,
          ),
        },
      };
    }),

  removeMessage: (channelId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).filter(
          (m) => m.id !== messageId,
        ),
      },
    })),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (user) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.some((u) => u.userId === user.userId)
        ? state.onlineUsers
        : [...state.onlineUsers, user],
    })),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.userId !== userId),
    })),

  addTypingUser: (event) =>
    set((state) => {
      const existing = state.typingUsers[event.channelId] ?? [];
      if (existing.some((u) => u.userId === event.userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [event.channelId]: [...existing, event],
        },
      };
    }),

  removeTypingUser: (channelId, userId) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: (state.typingUsers[channelId] ?? []).filter(
          (u) => u.userId !== userId,
        ),
      },
    })),
}));
