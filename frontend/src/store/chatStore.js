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
  updateWorkspace: (workspaceId, updates) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, ...updates } : w
      ),
      activeWorkspace:
        state.activeWorkspace?.id === workspaceId
          ? { ...state.activeWorkspace, ...updates }
          : state.activeWorkspace,
    })),
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

    const newLastMessage = {
      id: message.id,
      channelId: message.channelId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      createdAt: message.createdAt || new Date().toISOString(),
    };

    const updatedWorkspaces = state.workspaces.map((ws) => {
      const isCurrentWs =
        ws.id === state.activeWorkspace?.id && state.activeChannelId === message.channelId;
      const hasChannel = ws.channels && ws.channels.some((c) => c.id === message.channelId);
      if (isCurrentWs || hasChannel) {
        return {
          ...ws,
          lastMessage: newLastMessage,
        };
      }
      return ws;
    });

    return {
      workspaces: updatedWorkspaces,
      activeWorkspace:
        state.activeWorkspace?.id &&
        (state.activeChannelId === message.channelId ||
          (state.activeWorkspace.channels &&
            state.activeWorkspace.channels.some((c) => c.id === message.channelId)))
          ? { ...state.activeWorkspace, lastMessage: newLastMessage }
          : state.activeWorkspace,
      messages: {
        ...state.messages,
        [message.channelId]: [...existing, message],
      },
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
