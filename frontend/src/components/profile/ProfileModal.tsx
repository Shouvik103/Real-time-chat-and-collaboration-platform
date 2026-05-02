import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { userApi } from '@/api/user.api';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

export function ProfileModal() {
  const user = useAuthStore((s) => s.user);
  const open = useUiStore((s) => s.profileModalOpen);
  const setOpen = useUiStore((s) => s.setProfileModalOpen);
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [pendingAvatarData, setPendingAvatarData] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with user data when modal opens
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName || '');
      setAvatarPreview(user.avatarUrl || '');
      setPendingAvatarData(null);
      setDescription(user.description || '');
      setDob(user.dob || '');
      setGender(user.gender || '');
    }
  }, [open, user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {};
      if (displayName.trim()) payload.displayName = displayName.trim();

      // If user picked a new file, send the base64 data
      if (pendingAvatarData !== null) {
        payload.avatarUrl = pendingAvatarData;
      }

      if (description.trim()) payload.description = description.trim();
      if (dob.trim()) payload.dob = dob.trim();
      if (gender.trim()) payload.gender = gender.trim();

      return userApi.updateProfile(payload);
    },
    onSuccess: (res) => {
      if (res.data.success) {
        useAuthStore.setState({ user: res.data.data.user });
      }
      toast.success('Profile updated successfully!');
      setOpen(false);
    },
    onError: (err: any) => {
      console.error('[ProfileModal] Update failed:', err?.response?.status, err?.response?.data, err?.message);
      toast.error(err?.response?.data?.error?.message || 'Failed to update profile');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Resize image to max 256×256 before converting to base64
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 256;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * (MAX / w)); w = MAX; }
        else       { w = Math.round(w * (MAX / h)); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAvatarPreview(dataUrl);
      setPendingAvatarData(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error('Failed to load image');
    };
    img.src = objectUrl;
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center pt-2 pb-4">
          <Avatar name={displayName || user.displayName} src={avatarPreview} size="xl" />
          
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-semibold text-brand hover:text-brand-light transition-colors"
            >
              Edit photo
            </button>
            {avatarPreview && (
              <button
                type="button"
                onClick={() => { setAvatarPreview(''); setPendingAvatarData(''); }}
                className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </div>

        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          placeholder="Your name"
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Description / Bio
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Tell us a little about yourself..."
            className="w-full rounded-lg border border-chat-border bg-chat-surface px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors resize-none"
          />
        </div>

        {/* Email is read-only for now */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-lg border border-chat-border bg-chat-surface px-4 py-2.5 text-sm text-slate-500 opacity-60 cursor-not-allowed focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border border-chat-border bg-chat-surface px-4 py-2.5 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-chat-border bg-chat-surface px-4 py-2.5 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors appearance-none"
            >
              <option value="" disabled className="text-slate-500">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Others">Others</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
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
