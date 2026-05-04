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
import { Avatar } from '@/components/ui/Avatar';
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
  const { joinChannel, leaveChannel, reactToMessage, deleteMessage: socketDeleteMessage } = useSocket();
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

  /** Get the avatar URL for the current DM conversation */
  const getConversationAvatarUrl = () => {
    if (!activeWorkspace) return null;
    if (activeWorkspace.type === 'DM') {
      if (activeWorkspace.members && currentUser) {
        const other = activeWorkspace.members.find((m) => m.id !== currentUser.id);
        if (other) return other.avatarUrl;
      }
    }
    return null;
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
    if (activeChannelId) {
      joinChannel(activeChannelId);
      // Mark channel as read and update global unread count
      import('@/api/notification.api').then(({ notificationApi }) => {
        notificationApi.markChannelRead(activeChannelId).then(() => {
          notificationApi.getUnreadCount().then((res) => {
            import('@/store/uiStore').then(({ useUiStore }) => {
              useUiStore.getState().setUnreadCount(res.data.data.unreadCount);
              useUiStore.getState().setChannelUnreadCounts(res.data.data.channelCounts || {});
              useUiStore.getState().setWorkspaceUnreadCounts(res.data.data.workspaceCounts || {});
            });
          });
        }).catch(() => {});
      });
    }
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

  const handleDelete = (msg: Message) => {
    if (window.confirm('Delete this message?')) {
      socketDeleteMessage(msg.id);
      toast.success('Message deleted');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  if (!activeChannelId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-chat">
        <div className="text-center space-y-5 px-8 max-w-sm">
          <div className="mx-auto h-24 w-24 rounded-full bg-chat-surface border border-chat-border flex items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              className="h-20 w-20"
              aria-label="InsTalk logo"
            >
              <defs>
                <linearGradient id="chatTalkGreen" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              {/* Back bubble outline */}
              <g transform="translate(10 -4)">
                <path
                  d="M70 22c16.6 0 30 12.6 30 28 0 9.5-5.2 17.9-13.4 22.9v11.4l-12.2-6.8c-1.4.2-2.9.3-4.4.3-16.6 0-30-12.6-30-28S53.4 22 70 22z"
                  fill="none"
                  stroke="url(#chatTalkGreen)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              </g>
              {/* Front bubble + inner details */}
              <g transform="translate(-6 4)">
                <path
                  d="M46 32c-16.6 0-30 12.6-30 28 0 9.5 5.2 17.9 13.4 22.9v11.4l12.2-6.8c1.4.2 2.9.3 4.4.3 16.6 0 30-12.6 30-28S62.6 32 46 32z"
                  fill="none"
                  stroke="url(#chatTalkGreen)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="46" cy="60" r="22" fill="#a7f3d0" opacity="0.9" />
                <circle cx="38" cy="60" r="3.6" fill="#0b101b" />
                <circle cx="46" cy="60" r="3.6" fill="#0b101b" />
                <circle cx="54" cy="60" r="3.6" fill="#0b101b" />
              </g>
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-white">Welcome to InsTalk</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Select a conversation from the sidebar to start chatting, or create a new group / direct message.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isDm = activeWorkspace?.type === 'DM';
  const conversationName = getConversationName();

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 relative">
      {/* Conversation header */}
      <header className="flex items-center gap-3 border-b border-chat-border px-4 py-3 bg-chat flex-shrink-0">
        {isDm ? (
          <div className="shrink-0">
            <Avatar
              name={conversationName}
              src={getConversationAvatarUrl()}
              size="sm"
            />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <UserGroupIcon className="h-4 w-4 text-brand-light" />
          </div>
        )}
        <h2 className="text-sm font-semibold text-white">{conversationName}</h2>
      </header>

      {/* Messages Area */}
      <div className="flex-1 relative overflow-hidden chat-bubble-pattern">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full w-full overflow-y-auto py-2 relative z-10"
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

              const isCurrentUser = currentUser?.id === msg.senderId;
              const currentAvatarUrl = isCurrentUser
                ? currentUser?.avatarUrl
                : activeWorkspace?.members?.find((m) => m.id === msg.senderId)?.avatarUrl;

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
                    currentAvatarUrl={currentAvatarUrl}
                    onEdit={setEditingMessage}
                    onDelete={handleDelete}
                    onReact={reactToMessage}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Typing indicator */}
      <TypingIndicator />

      {/* Input */}
      <MessageInput 
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </div>
  );
}
