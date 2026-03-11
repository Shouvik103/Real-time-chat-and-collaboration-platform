import { useEffect, useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import {
  PlusIcon,
  UserPlusIcon,
  UserGroupIcon,
  LinkIcon,
  ArrowRightEndOnRectangleIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  EllipsisVerticalIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

import { useChatStore } from '@/store/chatStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { workspaceApi } from '@/api/workspace.api';
import { UserInfo } from './UserInfo';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Workspace } from '@/types';

export function Sidebar() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
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
    createDmModalOpen,
    setCreateDmModalOpen,
    inviteMemberModalOpen,
    setInviteMemberModalOpen,
    joinByCodeModalOpen,
    setJoinByCodeModalOpen,
  } = useUiStore();

  const [contextMenuWs, setContextMenuWs] = useState<string | null>(null);
  const [deleteWsConfirmOpen, setDeleteWsConfirmOpen] = useState(false);
  const [deleteTargetWs, setDeleteTargetWs] = useState<Workspace | null>(null);

  // Fetch workspaces
  const { data: wsData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceApi.getWorkspaces().then((r) => r.data.data.workspaces),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (wsData) {
      setWorkspaces(wsData);
      // Only auto-switch if the currently active workspace was deleted
      // (not on initial load — let user pick their conversation)
      if (activeWorkspace) {
        const stillExists = wsData.find((w) => w.id === activeWorkspace.id);
        if (!stillExists && wsData.length > 0) {
          setActiveWorkspace(wsData[0]);
        }
      }
    }
  }, [wsData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch channels when workspace changes — auto-select default channel
  const { data: channelsData } = useQuery({
    queryKey: ['channels', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: () =>
      workspaceApi
        .getChannels(activeWorkspace!.id)
        .then((r) => r.data.data.channels),
  });

  useEffect(() => {
    if (channelsData) {
      setChannels(channelsData);
      // Always auto-select the first (default) channel
      if (channelsData.length > 0) {
        const currentActiveId = useChatStore.getState().activeChannelId;
        const stillExists = channelsData.some((c: any) => c.id === currentActiveId);
        if (!currentActiveId || !stillExists) {
          setActiveChannel(channelsData[0].id);
        }
      } else {
        useChatStore.setState({ activeChannelId: null });
      }
    }
  }, [channelsData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Split workspaces into groups and DMs
  const groups = workspaces.filter((w) => w.type !== 'DM');
  const dms = workspaces.filter((w) => w.type === 'DM');

  /** Get display name for a DM workspace (the other person's name) */
  const getDmDisplayName = (ws: Workspace) => {
    if (ws.members && currentUser) {
      const other = ws.members.find((m) => m.id !== currentUser.id);
      if (other) return other.displayName;
    }
    return 'Direct Message';
  };

  /** Get avatar letter for a DM workspace */
  const getDmAvatar = (ws: Workspace) => {
    if (ws.members && currentUser) {
      const other = ws.members.find((m) => m.id !== currentUser.id);
      if (other) return other.displayName[0]?.toUpperCase() ?? '?';
    }
    return '?';
  };

  const selectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    setContextMenuWs(null);
  };

  // ─── Create workspace (group) modal ───────────────────────────────────
  const [wsName, setWsName] = useState('');
  const createWsMutation = useMutation({
    mutationFn: (name: string) => workspaceApi.createWorkspace(name),
    onSuccess: (res) => {
      const ws = res.data.data.workspace;
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspace(ws);
      setCreateWorkspaceModalOpen(false);
      setWsName('');
      toast.success(`Group "${ws.name}" created!`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create group'),
  });

  const handleCreateWorkspace = (e: FormEvent) => {
    e.preventDefault();
    if (wsName.trim()) createWsMutation.mutate(wsName.trim());
  };

  // ─── Create DM modal ─────────────────────────────────────────────────
  const [dmInviteCode, setDmInviteCode] = useState('');

  const createDmMutation = useMutation({
    mutationFn: () => workspaceApi.createDm(),
    onSuccess: (res) => {
      const { workspace, inviteCode } = res.data.data;
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspace(workspace);
      setDmInviteCode(inviteCode);
      toast.success('DM created! Share the code with the other person.');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message || 'Failed to create DM'),
  });

  const copyDmCode = () => {
    if (dmInviteCode) {
      navigator.clipboard.writeText(dmInviteCode);
      toast.success('Invite code copied!');
    }
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
      toast.success(`${m.displayName} added!`);
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
      toast.success('Invite code copied!');
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
    mutationFn: () => workspaceApi.deleteWorkspace(deleteTargetWs!.id),
    onSuccess: () => {
      const deletedId = deleteTargetWs!.id;
      const remaining = workspaces.filter((w) => w.id !== deletedId);
      queryClient.removeQueries({ queryKey: ['channels', deletedId] });
      queryClient.removeQueries({ queryKey: ['members', deletedId] });
      queryClient.removeQueries({ queryKey: ['inviteCode', deletedId] });
      setWorkspaces(remaining);
      setChannels([]);
      setActiveChannel(null as unknown as string);
      if (remaining.length > 0) {
        setActiveWorkspace(remaining[0]);
      }
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setDeleteWsConfirmOpen(false);
      setDeleteTargetWs(null);
      toast.success('Deleted');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to delete'),
  });

  return (
    <aside
      className={clsx(
        'flex h-screen flex-col bg-sidebar border-r border-chat-border transition-all duration-200',
        sidebarOpen ? 'w-72' : 'w-0 overflow-hidden',
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-chat-border p-4">
        <h1 className="text-lg font-bold text-white tracking-tight">Chats</h1>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {/* Groups section */}
        {groups.length > 0 && (
          <section className="pt-3 pb-1">
            <div className="flex items-center justify-between px-4 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Groups
              </h3>
              <button
                onClick={() => setCreateWorkspaceModalOpen(true)}
                className="text-slate-500 hover:text-white transition-colors"
                title="Create group"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col">
              {groups.map((ws) => (
                <div key={ws.id} className="group relative">
                  <button
                    onClick={() => selectWorkspace(ws)}
                    className={clsx(
                      'flex w-full items-center gap-3 px-4 py-2.5 transition-colors',
                      ws.id === activeWorkspace?.id
                        ? 'bg-sidebar-active'
                        : 'hover:bg-sidebar-hover',
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                      <UserGroupIcon className="h-5 w-5 text-brand-light" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className={clsx(
                        'text-sm font-medium truncate',
                        ws.id === activeWorkspace?.id ? 'text-white' : 'text-slate-300',
                      )}>
                        {ws.name}
                      </p>
                    </div>
                  </button>
                  {/* Context menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuWs(contextMenuWs === ws.id ? null : ws.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center rounded p-1 text-slate-500 hover:text-white transition-colors"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </button>
                  {/* Context dropdown */}
                  {contextMenuWs === ws.id && (
                    <div className="absolute right-2 top-full z-30 rounded-md bg-chat-surface border border-chat-border shadow-lg py-1 min-w-[160px]">
                      <button
                        onClick={() => {
                          selectWorkspace(ws);
                          setContextMenuWs(null);
                          setInviteCodeOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-hover"
                      >
                        <LinkIcon className="h-4 w-4" /> Share code
                      </button>
                      <button
                        onClick={() => {
                          selectWorkspace(ws);
                          setContextMenuWs(null);
                          setInviteMemberModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-hover"
                      >
                        <UserPlusIcon className="h-4 w-4" /> Invite member
                      </button>
                      <button
                        onClick={() => {
                          selectWorkspace(ws);
                          setContextMenuWs(null);
                          setMembersOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-hover"
                      >
                        <UserGroupIcon className="h-4 w-4" /> View members
                      </button>
                      {ws.ownerId === currentUser?.id && (
                        <button
                          onClick={() => {
                            setContextMenuWs(null);
                            setDeleteTargetWs(ws);
                            setDeleteWsConfirmOpen(true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-sidebar-hover"
                        >
                          <TrashIcon className="h-4 w-4" /> Delete group
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DMs section */}
        <section className="pt-3 pb-1">
          <div className="flex items-center justify-between px-4 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Direct Messages
            </h3>
            <button
              onClick={() => {
                setDmInviteCode('');
                setCreateDmModalOpen(true);
              }}
              className="text-slate-500 hover:text-white transition-colors"
              title="New DM"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col">
            {dms.length === 0 ? (
              <p className="px-4 py-2 text-xs text-slate-500">No direct messages yet</p>
            ) : (
              dms.map((ws) => {
                const displayName = getDmDisplayName(ws);
                const avatarLetter = getDmAvatar(ws);
                const isWaiting = ws.members && ws.members.length < 2;
                return (
                  <div key={ws.id} className="group relative">
                    <button
                      onClick={() => selectWorkspace(ws)}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-2.5 transition-colors',
                        ws.id === activeWorkspace?.id
                          ? 'bg-sidebar-active'
                          : 'hover:bg-sidebar-hover',
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-emerald-600/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                        {avatarLetter}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className={clsx(
                          'text-sm font-medium truncate',
                          ws.id === activeWorkspace?.id ? 'text-white' : 'text-slate-300',
                        )}>
                          {isWaiting ? 'Waiting for someone…' : displayName}
                        </p>
                        {isWaiting && (
                          <p className="text-xs text-slate-500 truncate">Share the invite code</p>
                        )}
                      </div>
                    </button>
                    {/* DM context actions */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenuWs(contextMenuWs === ws.id ? null : ws.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center rounded p-1 text-slate-500 hover:text-white transition-colors"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                    {contextMenuWs === ws.id && (
                      <div className="absolute right-2 top-full z-30 rounded-md bg-chat-surface border border-chat-border shadow-lg py-1 min-w-[160px]">
                        <button
                          onClick={() => {
                            selectWorkspace(ws);
                            setContextMenuWs(null);
                            setInviteCodeOpen(true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-hover"
                        >
                          <LinkIcon className="h-4 w-4" /> Share code
                        </button>
                        {ws.ownerId === currentUser?.id && (
                          <button
                            onClick={() => {
                              setContextMenuWs(null);
                              setDeleteTargetWs(ws);
                              setDeleteWsConfirmOpen(true);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-sidebar-hover"
                          >
                            <TrashIcon className="h-4 w-4" /> Delete chat
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Bottom action bar */}
      <div className="flex-shrink-0 border-t border-chat-border p-2 flex gap-1">
        <button
          onClick={() => setCreateWorkspaceModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs text-slate-400 hover:text-white hover:bg-sidebar-hover transition-colors"
          title="New Group"
        >
          <UserGroupIcon className="h-4 w-4" />
          Group
        </button>
        <button
          onClick={() => { setDmInviteCode(''); setCreateDmModalOpen(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs text-slate-400 hover:text-white hover:bg-sidebar-hover transition-colors"
          title="New DM"
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          DM
        </button>
        <button
          onClick={() => setJoinByCodeModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs text-slate-400 hover:text-white hover:bg-sidebar-hover transition-colors"
          title="Join by code"
        >
          <ArrowRightEndOnRectangleIcon className="h-4 w-4" />
          Join
        </button>
      </div>

      {/* User info */}
      <div className="flex-shrink-0 border-t border-chat-border p-3">
        <UserInfo />
      </div>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Create group modal */}
      <Modal
        open={createWorkspaceModalOpen}
        onClose={() => setCreateWorkspaceModalOpen(false)}
        title="Create Group"
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Group Name"
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

      {/* Create DM modal */}
      <Modal
        open={createDmModalOpen}
        onClose={() => setCreateDmModalOpen(false)}
        title="New Direct Message"
      >
        {!dmInviteCode ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Create a private 1-on-1 chat. You'll get an invite code to share with the other person.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setCreateDmModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => createDmMutation.mutate()}
                loading={createDmMutation.isPending}
              >
                Create DM
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Share this code with the person you want to chat with. They can use it to join the conversation.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-chat-surface border border-chat-border px-3 py-2.5 text-sm text-white font-mono select-all break-all">
                {dmInviteCode}
              </code>
              <Button size="sm" type="button" onClick={copyDmCode}>
                <ClipboardDocumentIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" type="button" onClick={() => setCreateDmModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invite member modal */}
      <Modal
        open={inviteMemberModalOpen}
        onClose={() => setInviteMemberModalOpen(false)}
        title={`Invite to ${activeWorkspace?.name ?? 'group'}`}
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
            The user must already have an account.
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
        <div className="flex justify-end mt-4 pt-3 border-t border-chat-border">
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
          Share this code so others can join.
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
            Regenerate
          </Button>
          <Button variant="ghost" type="button" onClick={() => setInviteCodeOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Join by code modal */}
      <Modal
        open={joinByCodeModalOpen}
        onClose={() => setJoinByCodeModalOpen(false)}
        title="Join by Code"
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
            Works for both group chats and DMs.
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

      {/* Delete confirm modal */}
      <Modal
        open={deleteWsConfirmOpen}
        onClose={() => setDeleteWsConfirmOpen(false)}
        title="Delete Chat"
      >
        <p className="text-sm text-slate-300 mb-1">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-white">{deleteTargetWs?.name}</span>?
        </p>
        <p className="text-xs text-slate-400 mb-5">
          This will permanently delete all messages. This cannot be undone.
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
