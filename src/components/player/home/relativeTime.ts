import { format, parseISO, isToday, isTomorrow } from 'date-fns';

export function relativeTime(dateStr: string, startTime: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today at ${startTime.slice(0, 5)}`;
  if (isTomorrow(date)) return `Tomorrow at ${startTime.slice(0, 5)}`;
  return `${format(date, 'EEE d MMM')} at ${startTime.slice(0, 5)}`;
}
