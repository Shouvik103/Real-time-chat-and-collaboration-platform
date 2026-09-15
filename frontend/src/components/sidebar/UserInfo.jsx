import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/store/uiStore";
export function UserInfo() {
  const user = useAuthStore((s) => s.user);
  const { logout, isLoggingOut } = useAuth();
  if (!user) return null;
  return <div className="flex items-center gap-2 rounded-md p-2 hover:bg-sidebar-hover transition-colors"><button
    onClick={() => useUiStore.getState().setProfileModalOpen(true)}
    className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer"
    title="Edit Profile"
  ><Avatar name={user.displayName} src={user.avatarUrl} size="sm" online /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{user.displayName}</p><p className="text-xs text-slate-500 truncate">{user.email}</p></div></button><button
    onClick={() => logout(void 0)}
    disabled={isLoggingOut}
    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
    title="Sign out"
  ><ArrowRightOnRectangleIcon className="h-4 w-4" /></button></div>;
}
