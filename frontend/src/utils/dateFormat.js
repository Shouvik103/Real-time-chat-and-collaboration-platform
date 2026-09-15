import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
export function formatMessageTime(dateStr) {
  return format(parseISO(dateStr), "h:mm a");
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
