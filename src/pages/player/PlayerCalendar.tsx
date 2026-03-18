import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { MapPin } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useMyUpcomingSessions } from '@/hooks/training/useTrainings';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  confirmed: { dot: 'bg-success', label: 'text-success' },
  pending: { dot: 'bg-warning', label: 'text-warning' },
  declined: { dot: 'bg-muted-foreground/40', label: 'text-muted-foreground' },
  no_show: { dot: 'bg-destructive', label: 'text-destructive' },
};

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
}

export default function PlayerCalendar() {
  const { data: sessions = [], isLoading } = useMyUpcomingSessions();

  // Build 28 days starting from today
  const today = new Date();
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i));

  // Group sessions by date
  const byDate: Record<string, any[]> = {};
  for (const a of sessions) {
    const d = a.training_sessions?.session_date;
    if (d) { byDate[d] = byDate[d] ?? []; byDate[d].push(a); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const daySessions = byDate[dateKey];
              const today_ = isToday(day);

              return (
                <div key={dateKey} className={`py-3 ${today_ ? '' : 'border-t border-border'}`}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-sm font-semibold ${today_ ? 'text-primary' : 'text-foreground'}`}>
                      {dayLabel(day)}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
                  </div>

                  {!daySessions || daySessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 pl-1">No trainings</p>
                  ) : (
                    <div className="space-y-2">
                      {daySessions.map((a: any) => {
                        const session = a.training_sessions;
                        const training = session?.trainings;
                        const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.pending;
                        const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';

                        return (
                          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                            <span className="text-xl shrink-0">{sportIcon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {session?.start_time?.slice(0, 5)} – {session?.end_time?.slice(0, 5)}
                                </span>
                                {training?.venue && (
                                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground truncate">
                                    <MapPin className="h-2.5 w-2.5 shrink-0" />{training.venue}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                              <span className={`text-xs font-medium capitalize ${style.label}`}>{a.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {sessions.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-medium text-foreground">No upcoming trainings</p>
              <p className="text-sm text-muted-foreground mt-1">Join a training to see your schedule</p>
            </div>
          )}
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
