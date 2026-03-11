import { useChatStore } from '@/store/chatStore';

export function TypingIndicator() {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const typingUsers = useChatStore(
    (s) => (activeChannelId ? s.typingUsers[activeChannelId] : undefined) ?? [],
  );

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.userName);
  let text: string;
  if (names.length === 1) text = `${names[0]} is typing`;
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing`;
  else text = 'Several people are typing';

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-slate-400 animate-pulse">
      <span className="inline-flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
      </span>
      {text}…
    </div>
  );
}
