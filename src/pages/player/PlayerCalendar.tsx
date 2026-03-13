import { useState } from 'react';
import { format, parseISO, startOfWeek, addDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { useMyUpcomingSessions } from '@/hooks/useTrainings';

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-success',
  pending: 'bg-warning',
  declined: 'bg-muted-foreground/40',
  no_show: 'bg-destructive',
};

export default function PlayerCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: sessions = [], isLoading } = useMyUpcomingSessions();

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const sessionsByDate = sessions.reduce((acc: Record<string, any[]>, a: any) => {
    const dateKey = a.training_sessions?.session_date;
    if (dateKey) {
      acc[dateKey] = acc[dateKey] ?? [];
      acc[dateKey].push(a);
    }
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-foreground">Calendar</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(v => v - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-foreground min-w-[100px] text-center">
                {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
              </span>
              <button
                onClick={() => setWeekOffset(v => v + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day strip */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const hasSessions = !!sessionsByDate[dateKey];
              const today = isToday(day);
              return (
                <div key={dateKey} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    today ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {hasSessions && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : weekDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySessions = sessionsByDate[dateKey] ?? [];
            if (!daySessions.length) return null;
            return (
              <div key={dateKey}>
                <p className={`text-xs font-semibold mb-2 ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isToday(day) ? 'Today' : format(day, 'EEEE, MMM d')}
                </p>
                <div className="space-y-2">
                  {daySessions.map((a: any) => {
                    const session = a.training_sessions;
                    const training = session?.trainings;
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? 'bg-muted'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">{session?.start_time?.slice(0, 5)}</span>
                            {training?.venue && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <MapPin className="h-2.5 w-2.5" />{training.venue}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-medium capitalize ${
                          a.status === 'confirmed' ? 'text-success' :
                          a.status === 'pending' ? 'text-warning' : 'text-muted-foreground'
                        }`}>{a.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {sessions.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-medium text-foreground">No sessions this week</p>
              <p className="text-sm text-muted-foreground mt-1">Join a training to see your schedule</p>
            </div>
          )}
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
