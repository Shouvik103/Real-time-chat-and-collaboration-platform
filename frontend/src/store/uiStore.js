import { create } from "zustand";
export const useUiStore = create()((set) => ({
  sidebarOpen: true,
  createWorkspaceModalOpen: false,
  createChannelModalOpen: false,
  inviteMemberModalOpen: false,
  joinByCodeModalOpen: false,
  createDmModalOpen: false,
  profileModalOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCreateWorkspaceModalOpen: (open) => set({ createWorkspaceModalOpen: open }),
  setCreateChannelModalOpen: (open) => set({ createChannelModalOpen: open }),
  setInviteMemberModalOpen: (open) => set({ inviteMemberModalOpen: open }),
  setJoinByCodeModalOpen: (open) => set({ joinByCodeModalOpen: open }),
  setCreateDmModalOpen: (open) => set({ createDmModalOpen: open }),
  setProfileModalOpen: (open) => set({ profileModalOpen: open })
}));
