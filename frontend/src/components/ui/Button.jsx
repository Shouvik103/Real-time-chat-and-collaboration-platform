import { clsx } from "clsx";
import { Spinner } from "./Spinner";
const variantClasses = {
  primary: "bg-brand hover:bg-brand-hover text-white focus-visible:ring-brand",
  secondary: "bg-chat-surface hover:bg-slate-100 dark:hover:bg-sidebar-hover text-slate-800 dark:text-white border border-chat-border focus-visible:ring-slate-400",
  ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-sidebar-hover text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus-visible:ring-slate-400",
  danger: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500"
};
const sizeClasses = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2"
};
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  children,
  className,
  disabled,
  ...props
}) {
  return <button
    className={clsx(
      "inline-flex items-center justify-center rounded-md font-medium",
      "transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-chat",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      variantClasses[variant],
      sizeClasses[size],
      className
    )}
    disabled={disabled || loading}
    {...props}
  >{loading ? <Spinner className="h-4 w-4" /> : leftIcon}{children}</button>;
}
