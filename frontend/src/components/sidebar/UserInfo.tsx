import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';

export function UserInfo() {
  const user = useAuthStore((s) => s.user);
  const { logout, isLoggingOut } = useAuth();
  const unreadCount = useUiStore((s) => s.unreadCount);
  const setNotificationPanelOpen = useUiStore((s) => s.setNotificationPanelOpen);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 rounded-md p-2 hover:bg-sidebar-hover transition-colors">
      <Avatar name={user.displayName} src={user.avatarUrl} size="sm" online />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
      </div>
      <button
        onClick={() => setNotificationPanelOpen(true)}
        className="relative p-1.5 text-slate-400 hover:text-white transition-colors"
        title="Notifications"
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <button
        onClick={() => logout(undefined)}
        disabled={isLoggingOut}
        className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
        title="Sign out"
      >
        <ArrowRightOnRectangleIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
