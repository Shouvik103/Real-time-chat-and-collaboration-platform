import { forwardRef } from "react";
import { clsx } from "clsx";
export const Input = forwardRef(
  ({ label, error, isInvalid, leftAddon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = Boolean(error || isInvalid);
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
              "w-full rounded-xl border border-white/10 bg-white/5",
              "px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/40",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-150",
              leftAddon && "pl-9",
              hasError && "!border-rose-500/70 !focus:ring-rose-500/40 !focus:border-rose-500/70",
              className
            )}
            {...props}
          />
        </div>
        {error && typeof error === "string" && (
          <p className="text-xs text-rose-400 mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
