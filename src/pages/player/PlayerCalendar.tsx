import { useState } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useMyUpcomingSessions, useUpsertAttendance } from '@/hooks/training/useTrainings';
import { SPORT_ICONS } from '@/lib/constants';
import { toast } from 'sonner';
import CalendarGrid from '@/components/shared/CalendarGrid';
import { getHoursUntilSession } from '@/components/player/home/sessionUtils';

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  confirmed: { dot: 'bg-success', label: 'text-success' },
  pending: { dot: 'bg-warning', label: 'text-warning' },
  declined: { dot: 'bg-muted-foreground/40', label: 'text-muted-foreground' },
  no_show: { dot: 'bg-destructive', label: 'text-destructive' },
};

export default function PlayerCalendar() {
  const { data: sessions = [], isLoading } = useMyUpcomingSessions();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="Calendar" />

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
            renderItem={(a: any) => (
              <CalendarSessionItem
                key={a.id}
                attendance={a}
                isExpanded={expandedId === a.id}
                onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
              />
            )}
          />
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}

function CalendarSessionItem({ attendance, isExpanded, onToggle }: {
  attendance: any; isExpanded: boolean; onToggle: () => void;
}) {
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const style = STATUS_STYLE[attendance.status] ?? STATUS_STYLE.pending;
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
  const upsert = useUpsertAttendance();
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const cancelDeadlineHours = training?.cancel_deadline_hours ?? 2;
  const hoursUntil = getHoursUntilSession(session?.session_date, session?.start_time);
  const isLateCancel = hoursUntil < cancelDeadlineHours;

  const canAct = attendance.status === 'confirmed' || attendance.status === 'declined' || attendance.status === 'pending';

  async function handleChange(newStatus: string) {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: newStatus });
    toast.success(newStatus === 'confirmed' ? "You're in! 🎉" : "Cancelled");
    setShowCancelWarning(false);
    onToggle(); // collapse
  }

  function handleCancelClick() {
    if (isLateCancel) {
      setShowCancelWarning(true);
    } else {
      handleChange('declined');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={canAct ? onToggle : undefined}
        className="flex items-center gap-3 px-4 py-3 w-full text-left"
      >
        <span className="text-xl shrink-0">{sportIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
          <span className="text-xs text-muted-foreground mt-0.5 block">
            {session?.start_time?.slice(0, 5)} – {session?.end_time?.slice(0, 5)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`h-2 w-2 rounded-full ${style.dot}`} />
          <span className={`text-xs font-medium capitalize ${style.label}`}>{attendance.status}</span>
        </div>
      </button>
      {training?.venue && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.venue)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <MapPin className="h-3 w-3" /> Navigate to {training.venue.split(',')[0]}
        </a>
      )}

      {isExpanded && (
        <div className="px-4 pb-3.5 border-t border-border pt-3">
          {showCancelWarning ? (
            <div className="rounded-xl bg-warning/8 border border-warning/20 p-3.5">
              <div className="flex items-start gap-2.5 mb-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Less than <strong>{cancelDeadlineHours}h</strong> before the lesson. Late cancellations may count against your record.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setShowCancelWarning(false); onToggle(); }}
                  className="rounded-lg bg-card border border-border py-2 text-xs font-semibold text-foreground min-h-[36px]"
                >
                  Keep my spot
                </button>
                <button
                  onClick={() => handleChange('declined')}
                  disabled={upsert.isPending}
                  className="rounded-lg bg-destructive/10 py-2 text-xs font-semibold text-destructive min-h-[36px] disabled:opacity-50"
                >
                  Cancel anyway
                </button>
              </div>
            </div>
          ) : attendance.status === 'pending' ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleChange('confirmed')}
                disabled={upsert.isPending}
                className="rounded-lg bg-success py-2.5 text-xs font-bold text-success-foreground min-h-[40px] disabled:opacity-50"
              >
                I'm coming
              </button>
              <button
                onClick={() => handleChange('declined')}
                disabled={upsert.isPending}
                className="rounded-lg bg-destructive/10 py-2.5 text-xs font-bold text-destructive min-h-[40px] disabled:opacity-50"
              >
                Can't make it
              </button>
            </div>
          ) : attendance.status === 'confirmed' ? (
            <button
              onClick={handleCancelClick}
              disabled={upsert.isPending}
              className="w-full rounded-lg bg-destructive/8 border border-destructive/15 py-2.5 text-xs font-semibold text-destructive min-h-[40px] disabled:opacity-50"
            >
              Can't make it anymore
            </button>
          ) : attendance.status === 'declined' ? (
            <button
              onClick={() => handleChange('confirmed')}
              disabled={upsert.isPending}
              className="w-full rounded-lg bg-success/10 border border-success/20 py-2.5 text-xs font-semibold text-success min-h-[40px] disabled:opacity-50"
            >
              Changed my mind — I'm coming
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
