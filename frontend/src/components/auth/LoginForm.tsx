import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login({ email: email.trim(), password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        leftAddon={<EnvelopeIcon className="h-4 w-4" />}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        leftAddon={<LockClosedIcon className="h-4 w-4" />}
      />

      <Button type="submit" className="w-full" loading={isLoggingIn}>
        Sign in
      </Button>

      {/* OAuth buttons — requires real credentials in .env */}
      <div className="relative flex items-center gap-3 py-2">
        <div className="flex-1 border-t border-chat-border" />
        <span className="text-xs text-slate-500">or continue with</span>
        <div className="flex-1 border-t border-chat-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="http://localhost:3001/api/auth/google"
          className="flex items-center justify-center gap-2 h-9 rounded-md border border-chat-border bg-sidebar text-sm text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <span className="font-semibold">G</span> Google
        </a>
        <button
          type="button"
          disabled
          title="Set GITHUB_CLIENT_ID in .env to enable"
          className="flex items-center justify-center gap-2 h-9 rounded-md border border-chat-border bg-sidebar text-sm text-slate-500 cursor-not-allowed opacity-50"
        >
          <span className="font-semibold">GH</span> GitHub
        </button>
      </div>

      <p className="text-center text-sm text-slate-400">
        No account?{' '}
        <Link to="/register" className="text-brand-light hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
