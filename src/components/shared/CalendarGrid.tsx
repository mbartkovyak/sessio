import { format, addDays, isToday, isTomorrow } from 'date-fns';

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
}

interface CalendarGridProps<T> {
  items: T[];
  getDate: (item: T) => string | undefined;
  renderItem: (item: T) => React.ReactNode;
  isLoading: boolean;
  emptyState?: React.ReactNode;
}

export default function CalendarGrid<T>({ items, getDate, renderItem, isLoading, emptyState }: CalendarGridProps<T>) {
  const today = new Date();
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i));

  const byDate: Record<string, T[]> = {};
  for (const item of items) {
    const d = getDate(item);
    if (d) { byDate[d] = byDate[d] ?? []; byDate[d].push(item); }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  return (
    <>
      {days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const daySessions = byDate[dateKey];
        const isToday_ = isToday(day);

        return (
          <div key={dateKey} className={`py-3 ${isToday_ ? '' : 'border-t border-border'}`}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-sm font-semibold ${isToday_ ? 'text-primary' : 'text-foreground'}`}>
                {dayLabel(day)}
              </span>
              <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
            </div>

            {!daySessions || daySessions.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 pl-1">No trainings</p>
            ) : (
              <div className="space-y-2">
                {daySessions.map(renderItem)}
              </div>
            )}
          </div>
        );
      })}

      {items.length === 0 && emptyState}
    </>
  );
}
