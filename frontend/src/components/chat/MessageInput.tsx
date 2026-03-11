import { useState, useRef, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/solid';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { fileApi } from '@/api/file.api';
import { useChatStore } from '@/store/chatStore';
import { useSocket } from '@/hooks/useSocket';

export function MessageInput() {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const { sendMessage, startTyping, stopTyping } = useSocket();

  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSend = useCallback(() => {
    if (!text.trim() || !activeChannelId) return;
    sendMessage(activeChannelId, text.trim());
    setText('');
    if (isTyping.current) {
      stopTyping(activeChannelId);
      isTyping.current = false;
    }
  }, [text, activeChannelId, sendMessage, stopTyping]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!activeChannelId) return;

    // Typing indicator debounce
    if (!isTyping.current) {
      isTyping.current = true;
      startTyping(activeChannelId);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (isTyping.current) {
        stopTyping(activeChannelId);
        isTyping.current = false;
      }
    }, 2000);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;
    try {
      setUploading(true);
      const res = await fileApi.upload(file, activeChannelId);
      const record = res.data.data;
      // Send a file message via socket
      sendMessage(activeChannelId, record.fileId, file.type.startsWith('image/') ? 'image' : 'file');
    } catch {
      // Upload error handled silently; could add toast
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!activeChannelId) return null;

  return (
    <div className="border-t border-chat-border bg-chat p-3 relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-3 z-50">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.DARK}
            lazyLoadEmojis
            height={380}
            width={320}
          />
        </div>
      )}

      <div className="flex items-end gap-2 rounded-lg bg-sidebar border border-chat-border px-3 py-2 focus-within:border-brand/50 transition-colors">
        {/* Emoji picker toggle */}
        <button
          onClick={() => setShowEmojiPicker((v) => !v)}
          className="shrink-0 p-1 text-slate-400 hover:text-white transition-colors"
          title="Emoji"
        >
          <FaceSmileIcon className="h-5 w-5" />
        </button>

        {/* File attach */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 p-1 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
          title="Attach file"
        >
          <PaperClipIcon className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.zip,.txt"
        />

        {/* Text area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowEmojiPicker(false)}
          placeholder="Type a message…"
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder-slate-500 outline-none max-h-32 overflow-y-auto"
          style={{ minHeight: '24px' }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="shrink-0 rounded-md bg-brand p-1.5 text-white transition-colors hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send message"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
