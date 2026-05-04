import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useUiStore } from '@/store/uiStore';
import type { Message, OnlineUser, TypingEvent, PresenceUpdate } from '@/types';

// ── Singleton socket ────────────────────────────────────────────────────────
// Multiple components call useSocket(). We must create exactly ONE connection
// and register event listeners exactly once.  A ref-count tracks how many
// components are mounted so the socket is torn down only when all unmount.

let globalSocket: Socket | null = null;
let refCount = 0;

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    refCount++;

    // If the socket already exists, just bump the ref count
    if (globalSocket?.connected || globalSocket?.active) {
      return () => {
        refCount--;
      };
    }

    // ── Create the one-and-only socket ──────────────────────────────────
    const socket = io('/', {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    globalSocket = socket;

    socket.on('connect', () => {
      console.log('[Socket] connected', socket.id);
      // Re-join the active channel room on reconnect
      const currentChannel = useChatStore.getState().activeChannelId;
      if (currentChannel) {
        socket.emit('join_channel', { channelId: currentChannel });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] disconnected', reason);
    });

    // Use store.getState() so callbacks always see the latest store
    // without needing to re-register on every render.
    const store = useChatStore.getState;

    socket.on('new_message', (message: Message) => {
      store().addMessage(message);
    });

    socket.on('message_updated', (message: Message) => {
      store().updateMessage(message);
    });

    socket.on('message_deleted', ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      store().removeMessage(channelId, messageId);
    });

    socket.on('typing_start', (event: TypingEvent) => {
      store().addTypingUser(event);
    });

    socket.on('typing_stop', ({ userId, channelId }: { userId: string; channelId: string }) => {
      store().removeTypingUser(channelId, userId);
    });

    socket.on('presence_update', (update: PresenceUpdate) => {
      if (update.status === 'online') {
        store().addOnlineUser({ userId: update.userId, displayName: update.displayName });
      } else {
        store().removeOnlineUser(update.userId);
      }
    });

    socket.on('online_users', (users: OnlineUser[]) => {
      store().setOnlineUsers(users);
    });

    socket.on('new_notification', (notification) => {
      const activeChannel = useChatStore.getState().activeChannelId;
      
      if (notification.data?.channelId === activeChannel) {
        // If we are already viewing the channel, mark it as read immediately
        // and do NOT increment the unread count or show a toast.
        import('@/api/notification.api').then(({ notificationApi }) => {
          notificationApi.markRead(notification.id).catch(() => {});
        });
      } else {
        // Increment unread count globally
        const { unreadCount, setUnreadCount, channelUnreadCounts, setChannelUnreadCounts, workspaceUnreadCounts, setWorkspaceUnreadCounts } = useUiStore.getState();
        setUnreadCount(unreadCount + 1);
        
        if (notification.data?.channelId) {
          setChannelUnreadCounts({
            ...channelUnreadCounts,
            [notification.data.channelId as string]: (channelUnreadCounts[notification.data.channelId as string] || 0) + 1
          });
        }
        
        if (notification.data?.workspaceId) {
          setWorkspaceUnreadCounts({
            ...workspaceUnreadCounts,
            [notification.data.workspaceId as string]: (workspaceUnreadCounts[notification.data.workspaceId as string] || 0) + 1
          });
        }

        import('react-hot-toast').then(({ default: toast }) => {
          toast.success(notification.title, { icon: '💬' });
        });
      }
    });

    // Cleanup: only disconnect when the LAST consumer unmounts
    return () => {
      refCount--;
      if (refCount <= 0) {
        socket.disconnect();
        globalSocket = null;
        refCount = 0;
      }
    };
  }, [isAuthenticated, accessToken]);

  // ── Actions — all use the singleton globalSocket ──────────────────────

  const joinChannel = useCallback((channelId: string) => {
    globalSocket?.emit('join_channel', { channelId });
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    globalSocket?.emit('leave_channel', { channelId });
  }, []);

  const sendMessage = useCallback(
    (channelId: string, content: string, type: 'text' | 'image' | 'file' = 'text') => {
      globalSocket?.emit('send_message', { channelId, content, type });
    },
    [],
  );

  const startTyping = useCallback((channelId: string) => {
    globalSocket?.emit('typing_start', { channelId });
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    globalSocket?.emit('typing_stop', { channelId });
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    globalSocket?.emit('react_to_message', { messageId, emoji });
  }, []);

  const editMessage = useCallback((messageId: string, content: string) => {
    globalSocket?.emit('edit_message', { messageId, content });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    globalSocket?.emit('delete_message', { messageId });
  }, []);

  return {
    socket: globalSocket,
    joinChannel,
    leaveChannel,
    sendMessage,
    startTyping,
    stopTyping,
    reactToMessage,
    editMessage,
    deleteMessage,
  };
}
