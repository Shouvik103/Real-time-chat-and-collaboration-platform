import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  updateAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),

      updateAccessToken: (token) =>
        set({ accessToken: token }),
    }),
    {
      name: 'chat-auth',
      partialize: (state) => ({
        // Strip base64 data-URL avatars before writing to localStorage
        // (they can be 10+ MB and blow the ~5 MB quota).
        // The avatar is still in memory and re-fetched on reload via /me.
        user: state.user
          ? {
              ...state.user,
              avatarUrl: state.user.avatarUrl?.startsWith('data:')
                ? null
                : state.user.avatarUrl,
            }
          : null,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
