import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useUpsertAttendance } from '@/hooks/training/useTrainings';
import { toast } from 'sonner';
import { SPORT_ICONS } from '@/lib/constants';
import { relativeTime } from './relativeTime';
import { getHoursUntilSession } from './sessionUtils';
import VenueLink from '@/components/shared/VenueLink';
import { useTranslation } from 'react-i18next';

export default function ThisWeekSection({ sessions }: { sessions: any[] }) {
  const { t } = useTranslation('player');
  if (sessions.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('thisWeek.title')}</h2>
      <div className="card-elevated rounded-xl divide-y divide-border">
        {sessions.slice(0, 8).map((a: any) => (
          <SessionRow key={a.id} attendance={a} />
        ))}
      </div>
    </div>
  );
}

function SessionRow({ attendance }: { attendance: any }) {
  const { t } = useTranslation('player');
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const upsert = useUpsertAttendance();
  const [showWarning, setShowWarning] = useState(false);
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';

  const isGoing = attendance.status === 'confirmed';
  const cancelDeadlineHours = training?.cancel_deadline_hours ?? 2;
  const hoursUntil = getHoursUntilSession(session?.session_date, session?.start_time);
  const isLateCancel = hoursUntil < cancelDeadlineHours;

  const notify = training?.coach?.id
    ? { coachId: training.coach.id, trainingName: training.name, trainingId: training.id }
    : undefined;

  async function switchTo(newStatus: string) {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: newStatus, notify });
    toast.success(newStatus === 'confirmed' ? t('thisWeek.backIn') : t('thisWeek.spotReleased'));
    setShowWarning(false);
  }

  function handleNotGoing() {
    if (isLateCancel) {
      setShowWarning(true);
    } else {
      switchTo('declined');
    }
  }

  return (
    <div className="px-4 py-3.5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-lg shrink-0">{sportIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(session?.session_date, session?.start_time)}</p>
          {training?.venue && <VenueLink venue={training.venue} className="text-xs text-muted-foreground" />}
        </div>

        {/* Segmented control — Google Calendar style */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button
            onClick={isGoing ? undefined : () => switchTo('confirmed')}
            disabled={upsert.isPending || isGoing}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              isGoing
                ? 'bg-success/15 text-success'
                : 'text-muted-foreground hover:bg-muted/50'
            } disabled:opacity-100`}
          >
            {t('thisWeek.going')}
          </button>
          <button
            onClick={isGoing ? handleNotGoing : undefined}
            disabled={upsert.isPending || !isGoing}
            className={`px-3 py-1.5 text-xs font-semibold border-l border-border transition-colors ${
              !isGoing
                ? 'bg-muted text-muted-foreground'
                : 'text-muted-foreground hover:bg-destructive/5 hover:text-destructive'
            } disabled:opacity-100`}
          >
            {t('thisWeek.notGoing')}
          </button>
        </div>
      </div>

      {/* Late cancellation warning — inline */}
      {showWarning && (
        <div className="rounded-xl bg-warning/8 border border-warning/20 p-3.5 ml-9">
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              {t('thisWeek.lateCancel', { hours: cancelDeadlineHours })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowWarning(false)}
              className="rounded-lg bg-card border border-border py-2 text-xs font-semibold text-foreground min-h-[36px]"
            >
              {t('thisWeek.keepSpot')}
            </button>
            <button
              onClick={() => switchTo('declined')}
              disabled={upsert.isPending}
              className="rounded-lg bg-destructive/10 py-2 text-xs font-semibold text-destructive min-h-[36px] disabled:opacity-50"
            >
              {t('thisWeek.cancelAnyway')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
