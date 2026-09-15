import { create } from "zustand";
export const useChatStore = create()((set) => ({
  activeWorkspace: null,
  activeChannelId: null,
  workspaces: [],
  channels: [],
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (workspace) => set((state) => {
    if (state.activeWorkspace?.id === workspace.id) return state;
    return { activeWorkspace: workspace, channels: [], activeChannelId: null };
  }),
  setChannels: (channels) => set({ channels }),
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  setMessages: (channelId, messages) => set((state) => ({
    messages: { ...state.messages, [channelId]: messages }
  })),
  prependMessages: (channelId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [channelId]: [...messages, ...state.messages[channelId] ?? []]
    }
  })),
  addMessage: (message) => set((state) => {
    const existing = state.messages[message.channelId] ?? [];
    if (existing.some((m) => m.id === message.id)) return state;
    return {
      messages: {
        ...state.messages,
        [message.channelId]: [...existing, message]
      }
    };
  }),
  updateMessage: (message) => set((state) => {
    const existing = state.messages[message.channelId] ?? [];
    return {
      messages: {
        ...state.messages,
        [message.channelId]: existing.map(
          (m) => m.id === message.id ? { ...m, ...message } : m
        )
      }
    };
  }),
  removeMessage: (channelId, messageId) => set((state) => ({
    messages: {
      ...state.messages,
      [channelId]: (state.messages[channelId] ?? []).filter(
        (m) => m.id !== messageId
      )
    }
  })),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addOnlineUser: (user) => set((state) => ({
    onlineUsers: state.onlineUsers.some((u) => u.userId === user.userId) ? state.onlineUsers : [...state.onlineUsers, user]
  })),
  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter((u) => u.userId !== userId)
  })),
  addTypingUser: (event) => set((state) => {
    const existing = state.typingUsers[event.channelId] ?? [];
    if (existing.some((u) => u.userId === event.userId)) return state;
    return {
      typingUsers: {
        ...state.typingUsers,
        [event.channelId]: [...existing, event]
      }
    };
  }),
  removeTypingUser: (channelId, userId) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [channelId]: (state.typingUsers[channelId] ?? []).filter(
        (u) => u.userId !== userId
      )
    }
  }))
}));
