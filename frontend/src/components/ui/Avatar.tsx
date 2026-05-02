import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-24 w-24 text-3xl',
};

const dotSizeMap = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorClass(name: string): string {
  const colors = [
    'bg-indigo-500',
    'bg-violet-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  return (
    <span className={clsx('relative inline-flex shrink-0', className)}>
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          className={clsx('rounded-full object-cover', sizeMap[size])}
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={clsx(
            'inline-flex items-center justify-center rounded-full font-semibold text-white select-none',
            sizeMap[size],
            getColorClass(name),
          )}
        >
          {getInitials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-sidebar',
            dotSizeMap[size],
            online ? 'bg-green-400' : 'bg-slate-500',
          )}
        />
      )}
    </span>
  );
}
