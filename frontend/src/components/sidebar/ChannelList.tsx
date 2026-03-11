import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useChatStore } from '@/store/chatStore';
import { useUiStore } from '@/store/uiStore';
import { workspaceApi } from '@/api/workspace.api';
import {
  HashtagIcon,
  LockClosedIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

export function ChannelList() {
  const channels = useChatStore((s) => s.channels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const setChannels = useChatStore((s) => s.setChannels);
  const activeWorkspace = useChatStore((s) => s.activeWorkspace);
  const setCreateChannelModalOpen = useUiStore((s) => s.setCreateChannelModalOpen);
  const queryClient = useQueryClient();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (channelId: string) =>
      workspaceApi.deleteChannel(activeWorkspace!.id, channelId),
    onSuccess: (_res, channelId) => {
      toast.success('Channel deleted');
      const remaining = channels.filter((c) => c.id !== channelId);
      setChannels(remaining);
      // Clear messages for the deleted channel and switch away if it was active
      const store = useChatStore.getState();
      if (store.activeChannelId === channelId) {
        useChatStore.setState({ activeChannelId: remaining[0]?.id ?? null });
      }
      // Remove cached messages
      const { [channelId]: _, ...rest } = store.messages;
      useChatStore.setState({ messages: rest });
      queryClient.invalidateQueries({ queryKey: ['channels', activeWorkspace?.id] });
      queryClient.removeQueries({ queryKey: ['messages', channelId] });
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to delete channel');
      setConfirmDeleteId(null);
    },
  });

  const publicChannels = channels.filter((c) => c.type === 'PUBLIC');
  const privateChannels = channels.filter((c) => c.type === 'PRIVATE');
  const directChannels = channels.filter((c) => c.type === 'DIRECT');

  const renderChannel = (channel: (typeof channels)[0]) => (
    <div
      key={channel.id}
      className="group relative flex items-center"
    >
      <button
        onClick={() => setActiveChannel(channel.id)}
        className={clsx(
          'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          channel.id === activeChannelId
            ? 'bg-sidebar-active text-white'
            : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-200',
        )}
      >
        {channel.type === 'PRIVATE' ? (
          <LockClosedIcon className="h-4 w-4 shrink-0" />
        ) : (
          <HashtagIcon className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{channel.name}</span>
      </button>
      {confirmDeleteId === channel.id ? (
        <div className="absolute right-1 flex items-center gap-1">
          <button
            onClick={() => deleteMutation.mutate(channel.id)}
            disabled={deleteMutation.isPending}
            className="rounded px-1.5 py-0.5 text-xs bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="rounded px-1.5 py-0.5 text-xs bg-slate-600 text-white hover:bg-slate-500"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(channel.id); }}
          className="absolute right-1 hidden group-hover:flex items-center justify-center rounded p-0.5 text-slate-500 hover:text-red-400 transition-colors"
          title="Delete channel"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <nav className="flex flex-col gap-3">
      {/* Public channels */}
      <section>
        <div className="flex items-center justify-between px-2 mb-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Channels
          </h3>
          <button
            onClick={() => setCreateChannelModalOpen(true)}
            className="text-slate-500 hover:text-white transition-colors"
            title="Create channel"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {publicChannels.map(renderChannel)}
        </div>
      </section>

      {/* Private channels */}
      {privateChannels.length > 0 && (
        <section>
          <h3 className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Private
          </h3>
          <div className="flex flex-col gap-0.5">
            {privateChannels.map(renderChannel)}
          </div>
        </section>
      )}

      {/* Direct Messages */}
      {directChannels.length > 0 && (
        <section>
          <h3 className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Direct Messages
          </h3>
          <div className="flex flex-col gap-0.5">
            {directChannels.map(renderChannel)}
          </div>
        </section>
      )}
    </nav>
  );
}
