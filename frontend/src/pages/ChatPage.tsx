import { useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { useSocket } from '@/hooks/useSocket';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';

export default function ChatPage() {
  // Establish socket connection
  useSocket();

  // Refresh user data from server on mount — this re-fetches the avatarUrl
  // that was stripped from localStorage by the partialize function in authStore
  useEffect(() => {
    const { isAuthenticated, setAuth, accessToken } = useAuthStore.getState();
    if (!isAuthenticated || !accessToken) return;

    // Fetch fresh user data
    authApi
      .getMe()
      .then((res) => {
        const freshUser = res.data.data.user;
        setAuth(freshUser, accessToken);
      })
      .catch(() => {});

    // Fetch initial notification count
    import('@/api/notification.api').then(({ notificationApi }) => {
      notificationApi.getUnreadCount().then((res) => {
        useUiStore.getState().setUnreadCount(res.data.data.unreadCount);
        useUiStore.getState().setChannelUnreadCounts(res.data.data.channelCounts || {});
        useUiStore.getState().setWorkspaceUnreadCounts(res.data.data.workspaceCounts || {});
      }).catch(() => {});
    });
  }, []);

  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-screen bg-chat overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0 min-h-0 relative">
        {/* Mobile toggle */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute top-3 left-3 z-10 p-2 rounded-md bg-chat-surface border border-chat-border text-slate-400 hover:text-white md:hidden"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        )}
        <ChatArea />
      </main>
      <ProfileModal />
      <NotificationPanel />
    </div>
  );
}
