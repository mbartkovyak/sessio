import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import i18n from '@/i18n';
import { getDateLocale } from '@/lib/dateFnsLocale';

export function relativeTime(dateStr: string, startTime: string) {
  const date = parseISO(dateStr);
  const time = startTime.slice(0, 5);
  if (isToday(date)) return i18n.t('calendar.todayAt', { time });
  if (isTomorrow(date)) return i18n.t('calendar.tomorrowAt', { time });
  return `${format(date, 'EEE d MMM', { locale: getDateLocale() })} ${i18n.t('calendar.at')} ${time}`;
}
