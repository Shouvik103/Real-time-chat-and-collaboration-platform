import React from "react";
import { resolveValue, toast } from "react-hot-toast";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

/**
 * ToastCard — Premium glassmorphic notification card
 * Positioned cleanly with smooth entrance, icon badge, and instant dismiss.
 */
export function ToastCard({ t }) {
  const message = resolveValue(t.message, t);

  const isError = t.type === "error";
  const isSuccess = t.type === "success";
  const isLoading = t.type === "loading";

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 max-w-[440px] w-auto
        px-4 py-3 rounded-2xl border backdrop-blur-2xl transition-all duration-300
        bg-[#0c121e]/95 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.85)]
        ${
          isError
            ? "border-rose-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(244,63,94,0.18)]"
            : isSuccess
            ? "border-emerald-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(16,185,129,0.18)]"
            : "border-indigo-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(99,102,241,0.18)]"
        }
        ${
          t.visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-2 scale-95"
        }
      `}
      role="alert"
    >
      {/* Glowing status icon badge */}
      <div
        className={`
          flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-xl border
          ${
            isError
              ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
              : isSuccess
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
          }
        `}
      >
        {isLoading ? (
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isError ? (
          <ExclamationCircleIcon className="h-5 w-5" />
        ) : isSuccess ? (
          <CheckCircleIcon className="h-5 w-5" />
        ) : (
          <InformationCircleIcon className="h-5 w-5" />
        )}
      </div>

      {/* Message Text */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-[13px] sm:text-sm font-medium leading-snug text-slate-100 break-words">
          {message}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
