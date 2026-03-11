import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

/**
 * Format a message timestamp to a short readable time.
 * e.g. "3:42 PM"
 */
export function formatMessageTime(dateStr: string): string {
  return format(parseISO(dateStr), 'h:mm a');
}

/**
 * Format a date string for the divider between groups of messages.
 * e.g. "Today", "Yesterday", "Monday, January 15"
 */
export function formatDateDivider(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

/**
 * Format a relative timestamp, e.g. "5 minutes ago" for recent activity.
 */
export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

/**
 * Check whether two ISO date strings fall on the same calendar day.
 */
export function isSameDay(dateStrA: string, dateStrB: string): boolean {
  const a = parseISO(dateStrA);
  const b = parseISO(dateStrB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Format file size into a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
