import { create } from "zustand";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("instalk-theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
};

let themeTransitionTimer = null;

const applyThemeToDom = (theme, withTransition = false) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (withTransition) {
    root.classList.add("theme-transitioning");
    if (themeTransitionTimer) clearTimeout(themeTransitionTimer);
    themeTransitionTimer = setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 280);
  }

  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
};

export const MIN_SIDEBAR_WIDTH = 260;
export const MAX_SIDEBAR_WIDTH = 600;
export const DEFAULT_SIDEBAR_WIDTH = 320;

const getInitialSidebarWidth = () => {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  const saved = localStorage.getItem("instalk-sidebar-width");
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
      return parsed;
    }
  }
  return DEFAULT_SIDEBAR_WIDTH;
};

const initialTheme = getInitialTheme();
applyThemeToDom(initialTheme);

export const useUiStore = create()((set) => ({
  theme: initialTheme,
  sidebarOpen: true,
  sidebarWidth: getInitialSidebarWidth(),
  sidebarSection: "groups", // "groups" | "dms"
  createWorkspaceModalOpen: false,
  createChannelModalOpen: false,
  inviteMemberModalOpen: false,
  joinByCodeModalOpen: false,
  createDmModalOpen: false,
  profileModalOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarWidth: (width) => {
    const clamped = Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
    localStorage.setItem("instalk-sidebar-width", clamped.toString());
    set({ sidebarWidth: clamped });
  },
  resetSidebarWidth: () => {
    localStorage.setItem("instalk-sidebar-width", DEFAULT_SIDEBAR_WIDTH.toString());
    set({ sidebarWidth: DEFAULT_SIDEBAR_WIDTH });
  },
  setSidebarSection: (section) => set({ sidebarSection: section }),
  setCreateWorkspaceModalOpen: (open) => set({ createWorkspaceModalOpen: open }),
  setCreateChannelModalOpen: (open) => set({ createChannelModalOpen: open }),
  setInviteMemberModalOpen: (open) => set({ inviteMemberModalOpen: open }),
  setJoinByCodeModalOpen: (open) => set({ joinByCodeModalOpen: open }),
  setCreateDmModalOpen: (open) => set({ createDmModalOpen: open }),
  setProfileModalOpen: (open) => set({ profileModalOpen: open }),
  setTheme: (theme) => {
    localStorage.setItem("instalk-theme", theme);
    applyThemeToDom(theme, true);
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("instalk-theme", nextTheme);
      applyThemeToDom(nextTheme, true);
      return { theme: nextTheme };
    });
  }
}));
