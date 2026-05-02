import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftAddon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftAddon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <span className="absolute left-3 text-slate-400/80">{leftAddon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border border-white/10 bg-white/5',
              'px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-300/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150',
              leftAddon && 'pl-9',
              error && 'border-red-500 focus:ring-red-500',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
