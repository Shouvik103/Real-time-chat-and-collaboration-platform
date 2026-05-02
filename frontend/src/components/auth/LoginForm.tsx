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
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <Button
        type="submit"
        className="w-full rounded-xl bg-[#008B8B] text-white hover:bg-[#007373] transition-all duration-300"
        loading={isLoggingIn}
      >
        Sign in
      </Button>

      {/* OAuth buttons — requires real credentials in .env */}
      <div className="relative flex items-center gap-3 py-4">
        <div className="flex-1 border-t border-white/10" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          or continue with
        </span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="http://localhost:3001/api/auth/google"
          className="flex items-center justify-center gap-2 h-10 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </a>
        <button
          type="button"
          disabled
          title="Set GITHUB_CLIENT_ID in .env to enable"
          className="flex items-center justify-center gap-2 h-10 rounded-full border border-white/5 bg-white/5 text-sm font-medium text-slate-500 cursor-not-allowed opacity-50"
        >
          <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          GitHub
        </button>
      </div>

      <p className="text-center text-sm text-slate-400">
        No account?{' '}
        <Link to="/register" className="text-emerald-300 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
