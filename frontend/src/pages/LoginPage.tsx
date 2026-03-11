import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-chat p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-3 text-2xl font-bold text-white">
            ChatPlatform
          </h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to your workspace</p>
        </div>

        <div className="rounded-xl border border-chat-border bg-chat-surface p-6 shadow-lg">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
