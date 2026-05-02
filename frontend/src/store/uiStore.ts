import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  notificationPanelOpen: boolean;
  createWorkspaceModalOpen: boolean;
  createChannelModalOpen: boolean;
  inviteMemberModalOpen: boolean;
  joinByCodeModalOpen: boolean;
  createDmModalOpen: boolean;
  profileModalOpen: boolean;
  unreadCount: number;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  setCreateWorkspaceModalOpen: (open: boolean) => void;
  setCreateChannelModalOpen: (open: boolean) => void;
  setInviteMemberModalOpen: (open: boolean) => void;
  setJoinByCodeModalOpen: (open: boolean) => void;
  setCreateDmModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  setUnreadCount: (count: number) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: true,
  notificationPanelOpen: false,
  createWorkspaceModalOpen: false,
  createChannelModalOpen: false,
  inviteMemberModalOpen: false,
  joinByCodeModalOpen: false,
  createDmModalOpen: false,
  profileModalOpen: false,
  unreadCount: 0,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
  setCreateWorkspaceModalOpen: (open) => set({ createWorkspaceModalOpen: open }),
  setCreateChannelModalOpen: (open) => set({ createChannelModalOpen: open }),
  setInviteMemberModalOpen: (open) => set({ inviteMemberModalOpen: open }),
  setJoinByCodeModalOpen: (open) => set({ joinByCodeModalOpen: open }),
  setCreateDmModalOpen: (open) => set({ createDmModalOpen: open }),
  setProfileModalOpen: (open) => set({ profileModalOpen: open }),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
