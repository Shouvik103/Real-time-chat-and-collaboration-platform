import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

export const useSocket = (workspaceId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    // Use environment variable for Socket URL
    const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
    
    socketRef.current = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    if (workspaceId) {
      socketRef.current.emit('join_workspace', workspaceId);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [accessToken, workspaceId]);

  return socketRef.current;
};
