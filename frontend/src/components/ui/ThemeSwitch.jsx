import { useUiStore } from "@/store/uiStore";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { clsx } from "clsx";

export function ThemeSwitch({ className }) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className={clsx(
        "relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        isDark
          ? "bg-[#18223a] border border-white/10 shadow-inner"
          : "bg-amber-100/90 border border-amber-300/60 shadow-inner",
        className
      )}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      aria-label={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
    >
      {/* Background track icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-slate-400">
        <SunIcon className={clsx("h-3.5 w-3.5 transition-opacity", isDark ? "opacity-40 text-slate-500" : "opacity-0")} />
        <MoonIcon className={clsx("h-3.5 w-3.5 transition-opacity", isDark ? "opacity-0" : "opacity-40 text-amber-500")} />
      </span>

      {/* Sliding knob with active icon */}
      <span
        className={clsx(
          "pointer-events-none relative flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-300 ease-in-out",
          isDark
            ? "translate-x-7 bg-indigo-600 text-amber-300 shadow-indigo-900/50"
            : "translate-x-0.5 bg-white text-amber-500 shadow-amber-500/20"
        )}
      >
        {isDark ? (
          <MoonIcon className="h-3.5 w-3.5 transform transition-transform duration-300 rotate-0" />
        ) : (
          <SunIcon className="h-3.5 w-3.5 transform transition-transform duration-300 rotate-0" />
        )}
      </span>
    </button>
  );
}
