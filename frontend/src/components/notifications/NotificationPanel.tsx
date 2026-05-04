import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useUiStore } from '@/store/uiStore';
import { notificationApi } from '@/api/notification.api';
import type { Notification } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { useChatStore } from '@/store/chatStore';

export function NotificationPanel() {
  const open = useUiStore((s) => s.notificationPanelOpen);
  const setOpen = useUiStore((s) => s.setNotificationPanelOpen);
  const setUnreadCount = useUiStore((s) => s.setUnreadCount);

  const overlayRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Fetch notifications when opened
  useEffect(() => {
    if (open) {
      setLoading(true);
      notificationApi.getNotifications(1, 50).then((res) => {
        setNotifications((res.data.data as any).notifications || []);
        setLoading(false);
      }).catch((err) => {
        console.error('Fetch notifications error:', err);
        setNotifications([{ id: 'error', title: 'Error', body: String(err), isRead: true, createdAt: new Date().toISOString() } as any]);
        setLoading(false);
      });
    }
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      notificationApi.getUnreadCount().then((res) => {
        setUnreadCount(res.data.data.unreadCount);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    
    // If it's a message or mention, navigate to the channel
    const channelId = notif.data?.channelId;
    if (channelId) {
      useChatStore.getState().setActiveChannel(channelId);
      setOpen(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex justify-end"
      onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="slide-over-title"
        className="relative z-10 w-full max-w-sm bg-chat-surface border-l border-chat-border shadow-2xl h-full flex flex-col transform transition-transform"
      >
        <div className="flex items-center justify-between p-4 border-b border-chat-border">
          <h2 id="slide-over-title" className="text-lg font-semibold text-white">
            Notifications
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6 text-brand" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`relative p-3 rounded-lg border ${notif.isRead ? 'bg-chat border-transparent' : 'bg-brand/10 border-brand/30'} hover:bg-sidebar-hover cursor-pointer transition-colors`}
              >
                {!notif.isRead && (
                  <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-brand" />
                )}
                <h3 className={`text-sm ${notif.isRead ? 'text-slate-300' : 'text-white font-medium'} pr-4`}>
                  {notif.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {notif.body}
                </p>
                <div className="text-[10px] text-slate-500 mt-2">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && notifications.some(n => !n.isRead) && (
          <div className="p-4 border-t border-chat-border bg-chat-surface">
            <button
              onClick={markAllAsRead}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-brand hover:text-brand-light transition-colors"
            >
              <CheckIcon className="h-4 w-4" />
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
