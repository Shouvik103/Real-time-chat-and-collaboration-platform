import { useEffect, useRef, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import { useMessages } from '@/hooks/useMessages';
import { messageApi } from '@/api/message.api';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { Spinner } from '@/components/ui/Spinner';
import { isSameDay, formatDateDivider } from '@/utils/dateFormat';
import { UserGroupIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import type { Message } from '@/types';

export function ChatArea() {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const activeWorkspace = useChatStore((s) => s.activeWorkspace);
  const currentUser = useAuthStore((s) => s.user);
  const storeMessages = useChatStore((s) =>
    activeChannelId ? s.messages[activeChannelId] ?? [] : [],
  );
  const setMessages = useChatStore((s) => s.setMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const { joinChannel, leaveChannel, reactToMessage } = useSocket();
  const queryClient = useQueryClient();

  /** Get the display name for the current conversation */
  const getConversationName = () => {
    if (!activeWorkspace) return 'Chat';
    if (activeWorkspace.type === 'DM') {
      if (activeWorkspace.members && currentUser) {
        const other = activeWorkspace.members.find((m) => m.id !== currentUser.id);
        if (other) return other.displayName;
      }
      return 'Direct Message';
    }
    return activeWorkspace.name;
  };

  // ─── Message history via React Query ─────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(activeChannelId);

  // Sync fetched pages into store
  useEffect(() => {
    if (!data || !activeChannelId) return;
    const merged = data.pages.flatMap((p) => p.messages).reverse();
    setMessages(activeChannelId, merged);
  }, [data, activeChannelId, setMessages]);

  // Join / leave socket room on channel change
  const prevChannelId = useRef<string | null>(null);
  useEffect(() => {
    if (prevChannelId.current) leaveChannel(prevChannelId.current);
    if (activeChannelId) joinChannel(activeChannelId);
    prevChannelId.current = activeChannelId;
  }, [activeChannelId, joinChannel, leaveChannel]);

  // ─── Auto-scroll to bottom on new messages ───────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 60;

    // Load more when scrolled to top
    if (scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storeMessages.length]);

  // ─── Edit / Delete mutations ──────────────────────────────────────────
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => messageApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeChannelId] });
      toast.success('Message deleted');
    },
  });

  const handleDelete = (msg: Message) => {
    if (window.confirm('Delete this message?')) {
      deleteMutation.mutate(msg.id);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  if (!activeChannelId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-chat">
        <div className="text-center space-y-5 px-8 max-w-sm">
          <div className="mx-auto h-24 w-24 rounded-full bg-chat-surface border border-chat-border flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-slate-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-white">Welcome to ChatApp</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Select a conversation from the sidebar to start chatting, or create a new group / direct message.
            </p>
          </div>
          <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            End-to-end encrypted
          </p>
        </div>
      </div>
    );
  }

  const isDm = activeWorkspace?.type === 'DM';
  const conversationName = getConversationName();

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Conversation header */}
      <header className="flex items-center gap-3 border-b border-chat-border px-4 py-3 bg-chat flex-shrink-0">
        {isDm ? (
          <div className="h-8 w-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
            {conversationName[0]?.toUpperCase() ?? '?'}
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <UserGroupIcon className="h-4 w-4 text-brand-light" />
          </div>
        )}
        <h2 className="text-sm font-semibold text-white">{conversationName}</h2>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2"
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Spinner className="h-5 w-5 text-brand" />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-brand" />
          </div>
        ) : storeMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          storeMessages.map((msg, i) => {
            const prev = storeMessages[i - 1];
            const showAvatar =
              !prev ||
              prev.senderId !== msg.senderId ||
              !isSameDay(prev.createdAt, msg.createdAt);

            // Date divider
            const showDivider =
              !prev || !isSameDay(prev.createdAt, msg.createdAt);

            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="flex items-center gap-3 px-4 my-3">
                    <div className="flex-1 border-t border-chat-border" />
                    <span className="text-xs font-medium text-slate-500">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                    <div className="flex-1 border-t border-chat-border" />
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  showAvatar={showAvatar}
                  onEdit={setEditingMessage}
                  onDelete={handleDelete}
                  onReact={reactToMessage}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Typing indicator */}
      <TypingIndicator />

      {/* Input */}
      <MessageInput />
    </div>
  );
}
