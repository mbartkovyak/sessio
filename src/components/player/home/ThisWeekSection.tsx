import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useUpsertAttendance } from '@/hooks/training/useTrainings';
import { toast } from 'sonner';
import { relativeTime } from './relativeTime';
import { getHoursUntilSession } from './sessionUtils';

export default function ThisWeekSection({ sessions }: { sessions: any[] }) {
  if (sessions.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">This Week</h2>
      <div className="card-elevated rounded-xl divide-y divide-border">
        {sessions.slice(0, 8).map((a: any) => (
          <SessionRow key={a.id} attendance={a} />
        ))}
      </div>
    </div>
  );
}

function SessionRow({ attendance }: { attendance: any }) {
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const upsert = useUpsertAttendance();
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const isConfirmed = attendance.status === 'confirmed';
  const isDeclined = attendance.status === 'declined';
  const cancelDeadlineHours = training?.cancel_deadline_hours ?? 2;
  const hoursUntil = getHoursUntilSession(session?.session_date, session?.start_time);
  const isLateCancel = hoursUntil < cancelDeadlineHours;

  async function handleChange(newStatus: string) {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: newStatus });
    toast.success(newStatus === 'confirmed' ? "You're back in! 🎉" : "Cancelled");
    setShowCancelWarning(false);
  }

  function handleCancelClick() {
    if (isLateCancel) {
      setShowCancelWarning(true);
    } else {
      handleChange('declined');
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full shrink-0 ${isConfirmed ? 'bg-success' : 'bg-muted-foreground/40'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(session?.session_date, session?.start_time)}</p>
        </div>
        {isConfirmed && (
          <button
            onClick={handleCancelClick}
            disabled={upsert.isPending}
            className="text-xs text-destructive/70 font-medium px-2 py-1 rounded-lg hover:bg-destructive/5 min-h-[32px] transition-colors disabled:opacity-50"
          >
            Can't go
          </button>
        )}
        {isDeclined && (
          <button
            onClick={() => handleChange('confirmed')}
            disabled={upsert.isPending}
            className="text-xs text-success font-medium px-2 py-1 rounded-lg hover:bg-success/5 min-h-[32px] transition-colors disabled:opacity-50"
          >
            I'm coming
          </button>
        )}
      </div>

      {/* Late cancellation warning */}
      {showCancelWarning && (
        <div className="mt-3 rounded-xl bg-warning/8 border border-warning/20 p-3.5">
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Less than <strong>{cancelDeadlineHours}h</strong> before the lesson. Late cancellations may count against your record.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowCancelWarning(false)}
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
      )}
    </div>
  );
}
