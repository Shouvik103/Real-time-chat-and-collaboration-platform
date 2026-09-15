import { useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
let globalSocket = null;
let refCount = 0;
export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    refCount++;
    if (globalSocket?.connected || globalSocket?.active) {
      return () => {
        refCount--;
      };
    }
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "/";
    const socket = io(socketUrl, {
      path: "/socket.io",
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1e3,
      reconnectionAttempts: 10
    });
    globalSocket = socket;
    socket.on("connect", () => {
      console.log("[Socket] connected", socket.id);
      const currentChannel = useChatStore.getState().activeChannelId;
      if (currentChannel) {
        socket.emit("join_channel", { channelId: currentChannel });
      }
    });
    socket.on("disconnect", (reason) => {
      console.log("[Socket] disconnected", reason);
    });
    const store = useChatStore.getState;
    socket.on("new_message", (message) => {
      store().addMessage(message);
    });
    socket.on("message_updated", (message) => {
      store().updateMessage(message);
    });
    socket.on("message_deleted", ({ messageId, channelId }) => {
      store().removeMessage(channelId, messageId);
    });
    socket.on("typing_start", (event) => {
      store().addTypingUser(event);
    });
    socket.on("typing_stop", ({ userId, channelId }) => {
      store().removeTypingUser(channelId, userId);
    });
    socket.on("presence_update", (update) => {
      if (update.status === "online") {
        store().addOnlineUser({ userId: update.userId, displayName: update.displayName });
      } else {
        store().removeOnlineUser(update.userId);
      }
    });
    socket.on("online_users", (users) => {
      store().setOnlineUsers(users);
    });
    return () => {
      refCount--;
      if (refCount <= 0) {
        socket.disconnect();
        globalSocket = null;
        refCount = 0;
      }
    };
  }, [isAuthenticated, accessToken]);
  const joinChannel = useCallback((channelId) => {
    globalSocket?.emit("join_channel", { channelId });
  }, []);
  const leaveChannel = useCallback((channelId) => {
    globalSocket?.emit("leave_channel", { channelId });
  }, []);
  const sendMessage = useCallback(
    (channelId, content, type = "text") => {
      globalSocket?.emit("send_message", { channelId, content, type });
    },
    []
  );
  const startTyping = useCallback((channelId) => {
    globalSocket?.emit("typing_start", { channelId });
  }, []);
  const stopTyping = useCallback((channelId) => {
    globalSocket?.emit("typing_stop", { channelId });
  }, []);
  const reactToMessage = useCallback((messageId, emoji) => {
    globalSocket?.emit("react_to_message", { messageId, emoji });
  }, []);
  const editMessage = useCallback((messageId, content) => {
    globalSocket?.emit("edit_message", { messageId, content });
  }, []);
  const deleteMessage = useCallback((messageId) => {
    globalSocket?.emit("delete_message", { messageId });
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
    deleteMessage
  };
}
