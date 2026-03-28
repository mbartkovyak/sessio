import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, X, RotateCcw, MessageCircle } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useMyUpcomingSessions, useUpsertAttendance } from '@/hooks/training/useTrainings';
import { SPORT_ICONS } from '@/lib/constants';
import { toast } from 'sonner';
import CalendarGrid from '@/components/shared/CalendarGrid';
import { getHoursUntilSession } from '@/components/player/home/sessionUtils';

export default function PlayerCalendar() {
  const { t } = useTranslation('player');
  const { data: sessions = [], isLoading } = useMyUpcomingSessions();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={t('calendar.title')} />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          <CalendarGrid
            items={sessions}
            getDate={(a: any) => a.training_sessions?.session_date}
            isLoading={isLoading}
            emptyState={
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-medium text-foreground">{t('calendar.noUpcoming')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('calendar.noUpcomingDesc')}</p>
              </div>
            }
            renderItem={(a: any) => (
              <CalendarSessionItem key={a.id} attendance={a} />
            )}
          />
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}

function CalendarSessionItem({ attendance }: { attendance: any }) {
  const { t } = useTranslation('player');
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
  const upsert = useUpsertAttendance();
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const cancelDeadlineHours = training?.confirmation_window_hours ?? 24;
  const hoursUntil = getHoursUntilSession(session?.session_date, session?.start_time);
  const isLateCancel = hoursUntil < cancelDeadlineHours;
  const isDeclined = attendance.status === 'declined';
  const isNoShow = attendance.status === 'no_show';

  const notify = training?.coach?.id
    ? { coachId: training.coach.id, trainingName: training.name, trainingId: training.id }
    : undefined;

  async function handleChange(newStatus: string) {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: newStatus, notify });
    toast.success(newStatus === 'confirmed' ? t('calendar.confirmed') : t('calendar.cancelled'));
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
    <div className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden ${isDeclined ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl shrink-0">{sportIcon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isDeclined ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{training?.name}</p>
          <span className="text-xs text-muted-foreground mt-0.5 block">
            {session?.start_time?.slice(0, 5)} – {session?.end_time?.slice(0, 5)}
          </span>
        </div>
        {/* Cancel / rejoin button — hidden when late cancel warning is showing */}
        {!showCancelWarning && (
          isDeclined ? (
            <button
              onClick={() => handleChange('confirmed')}
              disabled={upsert.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 hover:bg-success/20 transition-colors shrink-0 disabled:opacity-50"
              title={t('calendar.changedMind')}
            >
              <RotateCcw className="h-3.5 w-3.5 text-success" />
            </button>
          ) : isNoShow ? (
            <span className="text-xs font-medium text-destructive shrink-0">{t('calendar.noShow')}</span>
          ) : (
            <button
              onClick={handleCancelClick}
              disabled={upsert.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors shrink-0 disabled:opacity-50"
              title={t('calendar.cantMakeItAnymore')}
            >
              <X className="h-3.5 w-3.5 text-destructive" />
            </button>
          )
        )}
      </div>
      {training?.venue && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.venue)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <MapPin className="h-3 w-3" /> {t('calendar.navigateTo', { venue: training.venue.split(',')[0] })}
        </a>
      )}

      {/* Late cancellation warning — inline */}
      {showCancelWarning && (
        <div className="px-4 pb-3.5 border-t border-border pt-3">
          <div className="rounded-xl bg-warning/8 border border-warning/20 p-3.5">
            <div className="flex items-start gap-2.5 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t('calendar.lateCancel', { hours: cancelDeadlineHours }) }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowCancelWarning(false)}
                className="rounded-lg bg-card border border-border py-2 text-xs font-semibold text-foreground min-h-[36px]"
              >
                {t('calendar.keepSpot')}
              </button>
              <button
                onClick={() => handleChange('declined')}
                disabled={upsert.isPending}
                className="rounded-lg bg-destructive/10 py-2 text-xs font-semibold text-destructive min-h-[36px] disabled:opacity-50"
              >
                {t('calendar.cancelAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
