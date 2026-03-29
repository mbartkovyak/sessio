import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, MessageCircle } from 'lucide-react';
import { useUpsertAttendance } from '@/hooks/training/useTrainings';
import { toast } from 'sonner';
import { SPORT_ICONS } from '@/lib/constants';
import { relativeTime } from './relativeTime';
import { getHoursUntilSession } from './sessionUtils';
import { useTranslation } from 'react-i18next';

export default function ThisWeekSection({ sessions }: { sessions: any[] }) {
  const { t } = useTranslation('player');
  if (sessions.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('thisWeek.title')}</h2>
      <div className="space-y-2">
        {sessions.slice(0, 8).map((a: any) => (
          <SessionCard key={a.id} attendance={a} />
        ))}
      </div>
    </div>
  );
}

function SessionCard({ attendance }: { attendance: any }) {
  const { t } = useTranslation('player');
  const navigate = useNavigate();
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const upsert = useUpsertAttendance();
  const [showWarning, setShowWarning] = useState(false);
  const [showRejoinConfirm, setShowRejoinConfirm] = useState(false);
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';

  const isDeclined = attendance.status === 'declined';
  const isNoShow = attendance.status === 'no_show';
  const cancelDeadlineHours = training?.confirmation_window_hours ?? 24;
  const hoursUntil = getHoursUntilSession(session?.session_date, session?.start_time);
  const isLateCancel = hoursUntil < cancelDeadlineHours;

  const notify = training?.coach?.id
    ? { coachId: training.coach.id, trainingName: training.name, trainingId: training.id }
    : undefined;

  async function switchTo(newStatus: string) {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: newStatus, notify });
    toast.success(newStatus === 'confirmed' ? t('thisWeek.backIn') : t('thisWeek.spotReleased'));
    setShowWarning(false);
    setShowRejoinConfirm(false);
  }

  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden ${isDeclined ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl shrink-0">{sportIcon}</span>
        <button onClick={() => navigate(`/player/training/${training?.id}`)} className="flex-1 min-w-0 text-left">
          <p className={`text-sm font-semibold truncate ${isDeclined ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{training?.name}</p>
          <span className="text-xs text-muted-foreground mt-0.5 block">
            {relativeTime(session?.session_date, session?.start_time)}
          </span>
        </button>

        {!showWarning && !showRejoinConfirm && (
          isDeclined ? (
            <button
              onClick={() => setShowRejoinConfirm(true)}
              disabled={upsert.isPending}
              className="rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success shrink-0 disabled:opacity-50"
            >
              {t('thisWeek.rejoin')}
            </button>
          ) : isNoShow ? (
            <span className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive shrink-0">{t('calendar.noShow')}</span>
          ) : (
            <button
              onClick={() => setShowWarning(true)}
              disabled={upsert.isPending}
              className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive shrink-0 disabled:opacity-50"
            >
              {t('thisWeek.cancelAnyway')}
            </button>
          )
        )}
      </div>

      {/* Footer: venue + chat */}
      <SessionFooter training={training} />

      {/* Rejoin confirmation */}
      {showRejoinConfirm && (
        <div className="px-4 pb-3.5 border-t border-border pt-3">
          <div className="rounded-xl p-3.5 bg-muted/50 border border-border">
            <p className="text-sm text-foreground mb-3">{t('thisWeek.rejoinConfirm')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowRejoinConfirm(false)} className="rounded-lg bg-card border border-border py-2 text-xs font-semibold text-foreground min-h-[36px]">
                {t('thisWeek.stayOut')}
              </button>
              <button onClick={() => switchTo('confirmed')} disabled={upsert.isPending} className="rounded-lg bg-success/15 py-2 text-xs font-semibold text-success min-h-[36px] disabled:opacity-50">
                {t('thisWeek.rejoin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {showWarning && (
        <div className="px-4 pb-3.5 border-t border-border pt-3">
          <div className={`rounded-xl p-3.5 ${isLateCancel ? 'bg-warning/8 border border-warning/20' : 'bg-muted/50 border border-border'}`}>
            {isLateCancel && (
              <div className="flex items-start gap-2.5 mb-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t('thisWeek.lateCancel', { hours: cancelDeadlineHours }) }} />
              </div>
            )}
            {!isLateCancel && (
              <p className="text-sm text-foreground mb-3">{t('thisWeek.cancelConfirm')}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowWarning(false)} className="rounded-lg bg-card border border-border py-2 text-xs font-semibold text-foreground min-h-[36px]">
                {t('thisWeek.keepSpot')}
              </button>
              <button onClick={() => switchTo('declined')} disabled={upsert.isPending} className="rounded-lg bg-destructive/10 py-2 text-xs font-semibold text-destructive min-h-[36px] disabled:opacity-50">
                {t('thisWeek.cancelAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionFooter({ training }: { training: any }) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const hasVenue = !!training?.venue;
  const hasChat = !!training?.id;

  if (!hasVenue && !hasChat) return null;

  return (
    <div className="flex border-t border-border divide-x divide-border">
      {hasVenue && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.venue)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <MapPin className="h-3 w-3" /> {training.venue.split(',')[0]}
        </a>
      )}
      {hasChat && (
        <button
          onClick={() => navigate(`/player/messages/${training.id}`)}
          className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <MessageCircle className="h-3 w-3" /> {t('chat.group')}
        </button>
      )}
    </div>
  );
}
