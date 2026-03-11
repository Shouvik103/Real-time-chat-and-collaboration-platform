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
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '🔥'];

export function MessageBubble({
  message,
  showAvatar,
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
        'group relative flex gap-3 px-4 py-1 hover:bg-sidebar/40 transition-colors',
        showAvatar ? 'mt-3' : '',
      )}
    >
      {/* Avatar column */}
      <div className="w-9 shrink-0">
        {showAvatar && (
          <Avatar
            name={message.senderName}
            src={message.senderAvatar}
            size="md"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white">
              {message.senderName}
            </span>
            <time className="text-[11px] text-slate-500">
              {formatMessageTime(message.createdAt)}
            </time>
            {message.edited && (
              <span className="text-[10px] text-slate-600">(edited)</span>
            )}
          </div>
        )}

        {/* Text content */}
        <p className="text-sm leading-relaxed text-slate-200 break-words whitespace-pre-wrap">
          {message.content}
        </p>

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

      {/* Hover actions */}
      <div className="absolute -top-3 right-4 hidden group-hover:flex items-center gap-0.5 rounded-md border border-chat-border bg-chat-surface shadow-md px-1">
        {/* Quick reactions */}
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact?.(message.id, emoji)}
            className="p-1 text-sm hover:bg-sidebar-hover rounded transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}

        {isOwn && (
          <>
            <div className="w-px h-4 bg-chat-border mx-0.5" />
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
          </>
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
