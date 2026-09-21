import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
export function formatMessageTime(dateStr) {
  return format(parseISO(dateStr), "h:mm a");
}
export function formatLastMessageTime(dateStr) {
  if (!dateStr) return "";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return format(date, "EEE");
    }
    return format(date, "MMM d");
  } catch {
    return "";
  }
}
export function formatDateDivider(dateStr) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}
export function formatRelativeTime(dateStr) {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}
export function isSameDay(dateStrA, dateStrB) {
  const a = parseISO(dateStrA);
  const b = parseISO(dateStrB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
