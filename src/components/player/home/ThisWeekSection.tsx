import { useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useUpsertAttendance } from '@/hooks/training/useTrainings';
import { toast } from 'sonner';
import { SPORT_ICONS } from '@/lib/constants';
import { relativeTime } from './relativeTime';
import { getHoursUntilSession } from './sessionUtils';

export default function ThisWeekSection({ sessions }: { sessions: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sessions.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">This Week</h2>
      <div className="card-elevated rounded-xl divide-y divide-border">
        {sessions.slice(0, 8).map((a: any) => (
          <SessionRow
            key={a.id}
            attendance={a}
            isExpanded={expandedId === a.id}
            onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({ attendance, isExpanded, onToggle }: {
  attendance: any; isExpanded: boolean; onToggle: () => void;
}) {
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const upsert = useUpsertAttendance();
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';

  const isConfirmed = attendance.status === 'confirmed';
  const cancelDeadlineHours = training?.cancel_deadline_hours ?? 2;
  const hoursUntil = getHoursUntilSession(session?.session_date, session?.start_time);
  const isLateCancel = hoursUntil < cancelDeadlineHours;

  async function handleChange(newStatus: string) {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: newStatus });
    toast.success(newStatus === 'confirmed' ? "You're back in! 🎉" : "Cancelled");
    setShowCancelWarning(false);
    onToggle();
  }

  function handleCancelClick() {
    if (isLateCancel) {
      setShowCancelWarning(true);
    } else {
      handleChange('declined');
    }
  }

  return (
    <div>
      {/* Main row — tap to expand */}
      <button onClick={onToggle} className="flex items-center gap-3 px-4 py-3.5 w-full text-left">
        <span className="text-lg shrink-0">{sportIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(session?.session_date, session?.start_time)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isConfirmed ? 'bg-success/8 text-success' : 'bg-muted text-muted-foreground'}`}>
            {isConfirmed ? 'Confirmed' : "Can't go"}
          </span>
          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Expanded — change options */}
      {isExpanded && (
        <div className="px-4 pb-4">
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
          ) : isConfirmed ? (
            <button
              onClick={handleCancelClick}
              disabled={upsert.isPending}
              className="w-full rounded-xl bg-destructive/8 border border-destructive/15 py-2.5 text-sm font-semibold text-destructive min-h-[40px] disabled:opacity-50"
            >
              Can't make it anymore
            </button>
          ) : (
            <button
              onClick={() => handleChange('confirmed')}
              disabled={upsert.isPending}
              className="w-full rounded-xl bg-success/10 border border-success/20 py-2.5 text-sm font-semibold text-success min-h-[40px] disabled:opacity-50"
            >
              Changed my mind — I'm coming
            </button>
          )}
        </div>
      )}
    </div>
  );
}
