import { MapPin } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useMyUpcomingSessions } from '@/hooks/training/useTrainings';
import { SPORT_ICONS } from '@/lib/constants';
import CalendarGrid from '@/components/shared/CalendarGrid';

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  confirmed: { dot: 'bg-success', label: 'text-success' },
  pending: { dot: 'bg-warning', label: 'text-warning' },
  declined: { dot: 'bg-muted-foreground/40', label: 'text-muted-foreground' },
  no_show: { dot: 'bg-destructive', label: 'text-destructive' },
};

export default function PlayerCalendar() {
  const { data: sessions = [], isLoading } = useMyUpcomingSessions();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          <CalendarGrid
            items={sessions}
            getDate={(a: any) => a.training_sessions?.session_date}
            isLoading={isLoading}
            emptyState={
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-medium text-foreground">No upcoming trainings</p>
                <p className="text-sm text-muted-foreground mt-1">Join a training to see your schedule</p>
              </div>
            }
            renderItem={(a: any) => {
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
            }}
          />
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
