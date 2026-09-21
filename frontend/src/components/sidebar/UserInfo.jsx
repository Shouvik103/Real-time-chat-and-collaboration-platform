import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/store/uiStore";

export function UserInfo() {
  const user = useAuthStore((s) => s.user);
  const { logout, isLoggingOut } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-sidebar-hover transition-colors">
      <button
        onClick={() => useUiStore.getState().setProfileModalOpen(true)}
        className="flex flex-1 items-center gap-2.5 min-w-0 text-left cursor-pointer"
        title="Edit Profile"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size="md" online />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-white truncate leading-snug">
            {user.displayName}
          </p>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate leading-tight">
            {user.email}
          </p>
        </div>
      </button>
      <button
        onClick={() => logout(undefined)}
        disabled={isLoggingOut}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-200/50 dark:hover:bg-sidebar-active transition-colors rounded-lg cursor-pointer shrink-0"
        title="Sign out"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
