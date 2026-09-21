import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { workspaceApi } from "@/api/workspace.api";
import { useChatStore } from "@/store/chatStore";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  PhotoIcon,
  TrashIcon,
  UserGroupIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";

export function EditGroupModal({ open, onClose, workspace }) {
  const queryClient = useQueryClient();
  const updateStoreWorkspace = useChatStore((s) => s.updateWorkspace);
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [useUrlInput, setUseUrlInput] = useState(false);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "");
      setAvatarUrl(workspace.avatarUrl || "");
      setUseUrlInput(false);
    }
  }, [workspace, open]);

  const updateMutation = useMutation({
    mutationFn: (data) => workspaceApi.updateWorkspace(workspace.id, data),
    onSuccess: (res) => {
      const updated = res.data.data.workspace;
      updateStoreWorkspace(workspace.id, updated);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Group updated successfully!");
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || "Failed to update group");
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      avatarUrl: avatarUrl ? avatarUrl : null
    });
  };

  if (!workspace) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Group">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name || "Group Avatar"}
                className="h-20 w-20 rounded-full object-cover border-2 border-brand/40 shadow-md"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-brand/20 border-2 border-dashed border-brand/40 flex items-center justify-center text-brand">
                <UserGroupIcon className="h-9 w-9 text-brand-light" />
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
              title="Change group photo"
            >
              <PhotoIcon className="h-6 w-6" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Avatar Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs"
            >
              <ArrowUpTrayIcon className="h-3.5 w-3.5" />
              <span>Upload Photo</span>
            </Button>

            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs flex items-center gap-1"
                title="Remove photo"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Remove</span>
              </Button>
            )}
          </div>

          {/* Toggle URL input option */}
          <button
            type="button"
            onClick={() => setUseUrlInput((v) => !v)}
            className="text-[12px] text-slate-400 hover:text-brand transition-colors cursor-pointer"
          >
            {useUrlInput ? "Hide image URL" : "Or use image URL instead"}
          </button>

          {useUrlInput && (
            <div className="w-full">
              <Input
                placeholder="https://example.com/logo.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="text-xs"
              />
            </div>
          )}
        </div>

        {/* Group Name Input */}
        <div>
          <Input
            label="Group Name"
            placeholder="e.g. Design Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-chat-border">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
