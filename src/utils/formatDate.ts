import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Formats an ISO string to a human-readable date for session history
 */
export function formatSessionDate(isoString: string): string {
  const date = dayjs(isoString);
  const now = dayjs();
  
  if (now.diff(date, 'day') < 1) {
    return date.fromNow();
  }
  
  if (now.year() === date.year()) {
    return date.format('MMM D');
  }
  
  return date.format('MMM D, YYYY');
}

/**
 * Formats an ISO string to a long date for detail screens
 */
export function formatLongDate(isoString: string): string {
  return dayjs(isoString).format('MMMM D, YYYY');
}
