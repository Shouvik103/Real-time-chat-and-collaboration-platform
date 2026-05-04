import { Avatar } from '@/components/ui/Avatar';
import { formatMessageTime } from '@/utils/dateFormat';
import { useAuthStore } from '@/store/authStore';
import {
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
  currentAvatarUrl?: string | null;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageBubble({
  message,
  showAvatar,
  currentAvatarUrl,
  onEdit,
  onDelete,
  onReact,
}: MessageBubbleProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const isOwn = message.senderId === userId;

  if (message.deleted) {
    return (
      <div className="px-4 py-1">
        <p className="text-sm italic text-slate-600">This message was deleted</p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group relative flex gap-2 px-4 py-1 transition-colors',
        showAvatar ? 'mt-3' : 'mt-0.5',
        isOwn ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div className="w-9 shrink-0 self-end">
        {showAvatar && (
          <Avatar
            name={message.senderName}
            src={currentAvatarUrl !== undefined ? currentAvatarUrl : message.senderAvatar}
            size="md"
          />
        )}
      </div>

      {/* Bubble + meta */}
      <div
        className={clsx(
          'flex flex-col max-w-[65%]',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {/* Sender name (above bubble) */}
        {showAvatar && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 flex-row">
            <span className="text-xs font-semibold text-slate-300">
              {message.senderName}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={clsx(
            'relative rounded-2xl px-4 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap border-2',
            isOwn
              ? 'bg-blue-600 text-white border-blue-400 rounded-br-sm'
              : 'bg-[#2a2d36] text-slate-200 border-slate-600 rounded-bl-sm',
          )}
        >
          <div>{message.content}</div>
          {message.edited && (
            <div className={clsx(
              "text-[10px] mt-1 italic",
              isOwn ? "text-blue-200/80 text-right" : "text-slate-400 text-right"
            )}>
              (edited)
            </div>
          )}

          {/* Hover actions inside bubble area */}
          {isOwn && (
            <div
              className={clsx(
                'absolute -top-7 hidden group-hover:flex items-center gap-0.5 rounded-md border border-chat-border bg-chat-surface shadow-md px-1 z-10',
                'right-0',
              )}
            >
              <button
                onClick={() => onEdit?.(message)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Edit"
              >
                <PencilSquareIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete?.(message)}
                className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                title="Delete"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Timestamp absolutely positioned next to the bubble */}
          <div 
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center",
              isOwn ? "right-full mr-2" : "left-full ml-2"
            )}
          >
            <time className="text-[10px] text-slate-500 whitespace-nowrap">
              {formatMessageTime(message.createdAt)}
            </time>
          </div>
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {aggregateReactions(message.reactions).map(({ emoji, count, hasOwn }) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                  hasOwn
                    ? 'border-brand/40 bg-brand/10 text-brand-light'
                    : 'border-chat-border bg-chat-surface text-slate-400 hover:border-slate-500',
                )}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function aggregateReactions(reactions: Message['reactions']) {
  const map = new Map<string, { count: number; userIds: string[] }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, userIds: [] };
    entry.count++;
    entry.userIds.push(r.userId);
    map.set(r.emoji, entry);
  }
  const userId = useAuthStore.getState().user?.id;
  return Array.from(map.entries()).map(([emoji, { count, userIds }]) => ({
    emoji,
    count,
    hasOwn: userId ? userIds.includes(userId) : false,
  }));
}
