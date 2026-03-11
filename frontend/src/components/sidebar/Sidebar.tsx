import { useEffect, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { ChevronDownIcon, PlusIcon, UserPlusIcon, UserGroupIcon, LinkIcon, ArrowRightEndOnRectangleIcon, TrashIcon } from '@heroicons/react/24/outline';

import { useChatStore } from '@/store/chatStore';
import { useUiStore } from '@/store/uiStore';
import { workspaceApi } from '@/api/workspace.api';
import { ChannelList } from './ChannelList';
import { UserInfo } from './UserInfo';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Workspace } from '@/types';

export function Sidebar() {
  const queryClient = useQueryClient();
  const {
    activeWorkspace,
    workspaces,
    setWorkspaces,
    setActiveWorkspace,
    setChannels,
    setActiveChannel,
  } = useChatStore();
  const {
    sidebarOpen,
    createWorkspaceModalOpen,
    setCreateWorkspaceModalOpen,
    createChannelModalOpen,
    setCreateChannelModalOpen,
    inviteMemberModalOpen,
    setInviteMemberModalOpen,
    joinByCodeModalOpen,
    setJoinByCodeModalOpen,
  } = useUiStore();

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [deleteWsConfirmOpen, setDeleteWsConfirmOpen] = useState(false);

  // Fetch workspaces
  const { data: wsData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceApi.getWorkspaces().then((r) => r.data.data.workspaces),
  });

  useEffect(() => {
    if (wsData) {
      setWorkspaces(wsData);
      // Switch away if active workspace was deleted or nothing is selected
      const stillExists = wsData.find((w) => w.id === activeWorkspace?.id);
      if (!stillExists && wsData.length > 0) {
        setActiveWorkspace(wsData[0]);
      }
    }
  }, [wsData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch channels when workspace changes (poll every 10 s for real-time updates)
  const { data: channelsData } = useQuery({
    queryKey: ['channels', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    refetchInterval: 10000,
    queryFn: () =>
      workspaceApi
        .getChannels(activeWorkspace!.id)
        .then((r) => r.data.data.channels),
  });

  useEffect(() => {
    if (channelsData) {
      setChannels(channelsData);
      const currentActiveId = useChatStore.getState().activeChannelId;
      const stillExists = channelsData.some((c: any) => c.id === currentActiveId);

      if (channelsData.length === 0) {
        // No channels left — clear active channel and stale messages
        useChatStore.setState({ activeChannelId: null });
      } else if (!currentActiveId || !stillExists) {
        // Active channel was deleted or never set — pick the first one
        setActiveChannel(channelsData[0].id);
      }
    }
  }, [channelsData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Create workspace modal ───────────────────────────────────────────
  const [wsName, setWsName] = useState('');
  const createWsMutation = useMutation({
    mutationFn: (name: string) => workspaceApi.createWorkspace(name),
    onSuccess: (res) => {
      const ws = res.data.data.workspace;
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspace(ws);
      setCreateWorkspaceModalOpen(false);
      setWsName('');
      toast.success(`Workspace "${ws.name}" created!`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create workspace'),
  });

  const handleCreateWorkspace = (e: FormEvent) => {
    e.preventDefault();
    if (wsName.trim()) createWsMutation.mutate(wsName.trim());
  };

  // ─── Create channel modal ────────────────────────────────────────────
  const [chName, setChName] = useState('');
  const [chDesc, setChDesc] = useState('');
  const [chPrivate, setChPrivate] = useState(false);

  const createChMutation = useMutation({
    mutationFn: () =>
      workspaceApi.createChannel(activeWorkspace!.id, {
        name: chName.trim().toLowerCase(),
        description: chDesc.trim() || undefined,
        type: chPrivate ? 'PRIVATE' : 'PUBLIC',
      }),
    onSuccess: (res) => {
      const ch = res.data.data.channel;
      queryClient.invalidateQueries({ queryKey: ['channels', activeWorkspace?.id] });
      setActiveChannel(ch.id);
      setCreateChannelModalOpen(false);
      setChName('');
      setChDesc('');
      setChPrivate(false);
      toast.success(`Channel #${ch.name} created!`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create channel'),
  });

  const handleCreateChannel = (e: FormEvent) => {
    e.preventDefault();
    if (chName.trim()) createChMutation.mutate();
  };

  // ─── Invite member modal ─────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [membersOpen, setMembersOpen] = useState(false);

  const { data: membersData } = useQuery({
    queryKey: ['members', activeWorkspace?.id],
    enabled: !!activeWorkspace && membersOpen,
    queryFn: () =>
      workspaceApi.getMembers(activeWorkspace!.id).then((r) => r.data.data.members),
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      workspaceApi.inviteMember(activeWorkspace!.id, email),
    onSuccess: (res) => {
      const m = res.data.data.member;
      queryClient.invalidateQueries({ queryKey: ['members', activeWorkspace?.id] });
      setInviteMemberModalOpen(false);
      setInviteEmail('');
      toast.success(`${m.displayName} added to workspace!`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to invite member'),
  });

  const handleInvite = (e: FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) inviteMutation.mutate(inviteEmail.trim());
  };

  // ─── Invite code (share code) ────────────────────────────────────────
  const [inviteCodeOpen, setInviteCodeOpen] = useState(false);

  const { data: inviteCodeData, refetch: refetchCode } = useQuery({
    queryKey: ['inviteCode', activeWorkspace?.id],
    enabled: !!activeWorkspace && inviteCodeOpen,
    queryFn: () =>
      workspaceApi.getInviteCode(activeWorkspace!.id).then((r) => r.data.data.inviteCode),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => workspaceApi.regenerateInviteCode(activeWorkspace!.id),
    onSuccess: () => {
      refetchCode();
      toast.success('Invite code regenerated');
    },
  });

  const copyInviteCode = () => {
    if (inviteCodeData) {
      navigator.clipboard.writeText(inviteCodeData);
      toast.success('Invite code copied to clipboard!');
    }
  };

  // ─── Join by code ────────────────────────────────────────────────────
  const [joinCode, setJoinCode] = useState('');

  const joinMutation = useMutation({
    mutationFn: (code: string) => workspaceApi.joinByCode(code),
    onSuccess: (res) => {
      const ws = res.data.data.workspace;
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspace(ws);
      setJoinByCodeModalOpen(false);
      setJoinCode('');
      toast.success(`Joined "${ws.name}"!`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message || 'Invalid invite code'),
  });

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) joinMutation.mutate(joinCode.trim());
  };

  // ─── Delete workspace ────────────────────────────────────────────────
  const deleteWsMutation = useMutation({
    mutationFn: () => workspaceApi.deleteWorkspace(activeWorkspace!.id),
    onSuccess: () => {
      const deletedId = activeWorkspace!.id;
      const remaining = workspaces.filter((w) => w.id !== deletedId);
      // Remove stale queries for the deleted workspace immediately
      queryClient.removeQueries({ queryKey: ['channels', deletedId] });
      queryClient.removeQueries({ queryKey: ['members', deletedId] });
      queryClient.removeQueries({ queryKey: ['inviteCode', deletedId] });
      // Immediately update local store so UI reflects the change without a refetch
      setWorkspaces(remaining);
      setChannels([]);
      setActiveChannel(null as unknown as string);
      if (remaining.length > 0) {
        setActiveWorkspace(remaining[0]);
      }
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setDeleteWsConfirmOpen(false);
      toast.success('Workspace deleted');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to delete workspace'),
  });

  const selectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    setWsDropdownOpen(false);
  };

  return (
    <aside
      className={clsx(
        'flex h-screen flex-col bg-sidebar border-r border-chat-border transition-all duration-200',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden',
      )}
    >
      {/* Workspace picker */}
      <div className="relative flex-shrink-0 border-b border-chat-border p-3">
        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-sidebar-hover transition-colors"
        >
          <span className="text-sm font-bold text-white truncate">
            {activeWorkspace?.name ?? 'Select workspace'}
          </span>
          <ChevronDownIcon className="h-4 w-4 text-slate-400 shrink-0" />
        </button>

        {wsDropdownOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 z-20 rounded-md bg-chat-surface border border-chat-border shadow-lg py-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => selectWorkspace(ws)}
                className={clsx(
                  'flex w-full items-center px-3 py-2 text-sm transition-colors',
                  ws.id === activeWorkspace?.id
                    ? 'bg-brand/20 text-brand-light'
                    : 'text-slate-300 hover:bg-sidebar-hover',
                )}
              >
                {ws.name}
              </button>
            ))}
            <div className="border-t border-chat-border mt-1 pt-1">
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  setInviteCodeOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-hover transition-colors"
              >
                <LinkIcon className="h-4 w-4" />
                Share invite code
              </button>
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  setInviteMemberModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-hover transition-colors"
              >
                <UserPlusIcon className="h-4 w-4" />
                Invite by email
              </button>
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  setMembersOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-hover transition-colors"
              >
                <UserGroupIcon className="h-4 w-4" />
                View members
              </button>
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  setJoinByCodeModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-sidebar-hover transition-colors"
              >
                <ArrowRightEndOnRectangleIcon className="h-4 w-4" />
                Join workspace
              </button>
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  setCreateWorkspaceModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-brand-light hover:bg-sidebar-hover transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                New workspace
              </button>
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  setDeleteWsConfirmOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-sidebar-hover transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
                Delete workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-3">
        <ChannelList />
      </div>

      {/* User info */}
      <div className="flex-shrink-0 border-t border-chat-border p-3">
        <UserInfo />
      </div>

      {/* Create workspace modal */}
      <Modal
        open={createWorkspaceModalOpen}
        onClose={() => setCreateWorkspaceModalOpen(false)}
        title="Create Workspace"
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. Engineering Team"
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setCreateWorkspaceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createWsMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create channel modal */}
      <Modal
        open={createChannelModalOpen}
        onClose={() => setCreateChannelModalOpen(false)}
        title="Create Channel"
      >
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <Input
            label="Channel Name"
            placeholder="e.g. general"
            value={chName}
            onChange={(e) => setChName(e.target.value)}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="What's this channel about?"
            value={chDesc}
            onChange={(e) => setChDesc(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={chPrivate}
              onChange={(e) => setChPrivate(e.target.checked)}
              className="accent-brand rounded"
            />
            Make this a private channel
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setCreateChannelModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createChMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
      {/* Invite member modal */}
      <Modal
        open={inviteMemberModalOpen}
        onClose={() => setInviteMemberModalOpen(false)}
        title={`Invite to ${activeWorkspace?.name ?? 'workspace'}`}
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <p className="text-xs text-slate-400">
            The user must already have a ChatPlatform account.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setInviteMemberModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={inviteMutation.isPending}>
              Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Members list modal */}
      <Modal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={`Members — ${activeWorkspace?.name ?? ''}`}
      >
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {membersData ? (
            membersData.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-1.5">
                <div className="h-8 w-8 rounded-full bg-brand/30 flex items-center justify-center text-sm font-bold text-brand-light shrink-0">
                  {m.displayName[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{m.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
                <span className="text-xs text-slate-500 capitalize shrink-0">{m.role.toLowerCase()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Loading…</p>
          )}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-chat-border">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => { setMembersOpen(false); setInviteMemberModalOpen(true); }}
          >
            <UserPlusIcon className="h-4 w-4 mr-1" /> Invite member
          </Button>
          <Button variant="ghost" type="button" onClick={() => setMembersOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Share invite code modal */}
      <Modal
        open={inviteCodeOpen}
        onClose={() => setInviteCodeOpen(false)}
        title={`Invite Code — ${activeWorkspace?.name ?? ''}`}
      >
        <p className="text-sm text-slate-400 mb-3">
          Share this code with others so they can join the workspace.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-chat-surface border border-chat-border px-3 py-2 text-sm text-white font-mono select-all break-all">
            {inviteCodeData ?? 'Loading…'}
          </code>
          <Button size="sm" type="button" onClick={copyInviteCode} disabled={!inviteCodeData}>
            Copy
          </Button>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-chat-border">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => regenerateMutation.mutate()}
            loading={regenerateMutation.isPending}
          >
            Regenerate code
          </Button>
          <Button variant="ghost" type="button" onClick={() => setInviteCodeOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Join workspace by code modal */}
      <Modal
        open={joinByCodeModalOpen}
        onClose={() => setJoinByCodeModalOpen(false)}
        title="Join Workspace"
      >
        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Invite Code"
            placeholder="Paste invite code here"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
          />
          <p className="text-xs text-slate-400">
            Ask the workspace owner for the invite code.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setJoinByCodeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={joinMutation.isPending}>
              Join
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete workspace confirm modal */}
      <Modal
        open={deleteWsConfirmOpen}
        onClose={() => setDeleteWsConfirmOpen(false)}
        title="Delete Workspace"
      >
        <p className="text-sm text-slate-300 mb-1">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-white">{activeWorkspace?.name}</span>?
        </p>
        <p className="text-xs text-slate-400 mb-5">
          This will permanently delete all channels and messages in this workspace.
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setDeleteWsConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => deleteWsMutation.mutate()}
            loading={deleteWsMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </aside>
  );
}
