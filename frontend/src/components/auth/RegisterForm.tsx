import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function RegisterForm() {
  const { register, isRegistering } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setConfirmError('Passwords do not match');
      return;
    }
    setConfirmError('');
    register({ email: email.trim(), password, displayName: displayName.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Display Name"
        type="text"
        placeholder="John Doe"
        autoComplete="name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        leftAddon={<UserIcon className="h-4 w-4" />}
      />
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
        placeholder="At least 8 characters"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        leftAddon={<LockClosedIcon className="h-4 w-4" />}
      />
      <Input
        label="Confirm Password"
        type="password"
        placeholder="Repeat password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        error={confirmError}
        leftAddon={<LockClosedIcon className="h-4 w-4" />}
      />

      <Button type="submit" className="w-full" loading={isRegistering}>
        Create account
      </Button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-light hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
