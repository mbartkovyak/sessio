import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/dateFnsLocale';

export interface CalendarGridHandle {
  scrollToToday: () => void;
}

interface CalendarGridProps<T> {
  items: T[];
  getDate: (item: T) => string | undefined;
  renderItem: (item: T) => React.ReactNode;
  isLoading: boolean;
  emptyState?: React.ReactNode;
}

function CalendarGridInner<T>({ items, getDate, renderItem, isLoading, emptyState }: CalendarGridProps<T>, ref: React.Ref<CalendarGridHandle>) {
  const { t } = useTranslation();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRef = useRef<HTMLDivElement>(null);

  const scrollToToday = useCallback(() => {
    todayRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  useImperativeHandle(ref, () => ({ scrollToToday }), [scrollToToday]);

  useEffect(() => {
    if (!isLoading && todayRef.current) {
      todayRef.current.scrollIntoView({ block: 'start' });
    }
  }, [isLoading]);

  function dayLabel(date: Date) {
    if (isToday(date)) return t('calendar.today');
    if (isTomorrow(date)) return t('calendar.tomorrow');
    if (isYesterday(date)) return t('calendar.yesterday');
    return format(date, 'EEEE', { locale: getDateLocale() });
  }

  // Group items by date
  const byDate: Record<string, T[]> = {};
  for (const item of items) {
    const d = getDate(item);
    if (d) { byDate[d] = byDate[d] ?? []; byDate[d].push(item); }
  }

  // Collect unique dates that have sessions, always include today
  const dateKeys = new Set(Object.keys(byDate));
  dateKeys.add(todayStr);
  const sortedDates = Array.from(dateKeys).sort();

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  let lastMonth = '';

  return (
    <>
      {sortedDates.map(dateKey => {
        const day = parseISO(dateKey);
        const daySessions = byDate[dateKey];
        const isToday_ = dateKey === todayStr;
        const isPast = dateKey < todayStr;
        const month = format(day, 'LLLL yyyy', { locale: getDateLocale() });
        const showMonthHeader = month !== lastMonth;
        lastMonth = month;

        return (
          <div key={dateKey} ref={isToday_ ? todayRef : undefined} style={isToday_ ? { scrollMarginTop: 72 } : undefined}>
            {showMonthHeader && (
              <div className="pt-4 pb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {month}
                </span>
              </div>
            )}
            <div className={`py-3 ${isToday_ ? 'border-l-3 border-l-primary pl-3 -ml-1 rounded-sm' : 'border-t border-border'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isToday_ && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                <span className={`text-sm font-semibold ${isToday_ ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {dayLabel(day)}
                </span>
                <span className="text-xs text-muted-foreground">{format(day, 'MMM d', { locale: getDateLocale() })}</span>
              </div>

              {!daySessions || daySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 pl-1">{t('calendar.noTrainings')}</p>
              ) : (
                <div className="space-y-2">
                  {daySessions.map(renderItem)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {items.length === 0 && emptyState}
    </>
  );
}

const CalendarGrid = forwardRef(CalendarGridInner) as <T>(
  props: CalendarGridProps<T> & { ref?: React.Ref<CalendarGridHandle> }
) => React.ReactElement | null;

export default CalendarGrid;
