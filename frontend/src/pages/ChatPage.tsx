import { Bars3Icon } from '@heroicons/react/24/outline';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { useSocket } from '@/hooks/useSocket';
import { useUiStore } from '@/store/uiStore';

export default function ChatPage() {
  // Establish socket connection
  useSocket();

  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-screen bg-chat">
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0">
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
    </div>
  );
}
