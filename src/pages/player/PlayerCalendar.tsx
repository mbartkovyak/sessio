import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, addWeeks, subWeeks } from 'date-fns';
import { AlertTriangle, MapPin, MessageCircle, ArrowDown, Check } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useMyUpcomingSessions, useUpsertAttendance, useLeaveSessionWaitlist } from '@/hooks/training/useTrainings';
import { SPORT_ICONS } from '@/lib/constants';
import { toast } from 'sonner';
import { openExternal } from '@/components/shared/VenueLink';
import CalendarGrid, { type CalendarGridHandle } from '@/components/shared/CalendarGrid';
import { getHoursUntilSession } from '@/components/player/home/sessionUtils';

const WINDOW_STEP = 4; // weeks per load
const INITIAL_FUTURE_WEEKS = 12; // ~3 months — coach typically schedules months ahead

export default function PlayerCalendar() {
  const { t } = useTranslation('player');
  const [pastWeeks, setPastWeeks] = useState(WINDOW_STEP);
  const [futureWeeks, setFutureWeeks] = useState(INITIAL_FUTURE_WEEKS);
  const now = new Date();
  const from = format(subWeeks(now, pastWeeks), 'yyyy-MM-dd');
  const to = format(addWeeks(now, futureWeeks), 'yyyy-MM-dd');

  const { data: sessions = [], isLoading, isFetching } = useMyUpcomingSessions({ from, to });
  const calendarRef = useRef<CalendarGridHandle>(null);
  const handleLoadPast = useCallback(() => setPastWeeks(w => w + WINDOW_STEP), []);
  const handleLoadFuture = useCallback(() => setFutureWeeks(w => w + WINDOW_STEP), []);
  const isExpandingWindow = isFetching && !isLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title={t('calendar.title')}
        left={
          <button
            onClick={() => calendarRef.current?.scrollToToday()}
            className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white transition-all active:scale-[0.95]"
          >
            <ArrowDown className="h-3 w-3" />
            {t('common:calendar.today')}
          </button>
        }
      />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          <CalendarGrid
            ref={calendarRef}
            items={sessions}
            getDate={(a: any) => a.training_sessions?.session_date}
            isLoading={isLoading}
            onLoadPast={handleLoadPast}
            onLoadFuture={handleLoadFuture}
            isLoadingPast={isExpandingWindow}
            isLoadingFuture={isExpandingWindow}
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
  const navigate = useNavigate();
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
  const upsert = useUpsertAttendance();
  const leaveWaitlist = useLeaveSessionWaitlist();
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [showRejoinConfirm, setShowRejoinConfirm] = useState(false);

  const cancelDeadlineHours = training?.confirmation_window_hours;
  const hoursUntil = getHoursUntilSession(session?.session_date, session?.start_time);
  const isLateCancel = cancelDeadlineHours != null && hoursUntil < cancelDeadlineHours;
  const isPast = !!session?.session_date && !!session?.end_time
    && new Date(`${session.session_date}T${session.end_time}`).getTime() < Date.now();
  const isDeclined = attendance.status === 'declined';
  const isNoShow = attendance.status === 'no_show';
  const isPending = attendance.status === 'pending';

  const notify = training?.coach?.id
    ? { coachId: training.coach.id, trainingName: training.name, trainingId: training.id }
    : undefined;

  async function handleChange(newStatus: string) {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: newStatus, notify });
    toast.success(newStatus === 'confirmed' ? t('calendar.confirmed') : t('calendar.cancelled'));
    setShowCancelWarning(false);
    setShowRejoinConfirm(false);
  }

  function handleCancelClick() {
    setShowCancelWarning(true);
  }

  function handleRejoinClick() {
    setShowRejoinConfirm(true);
  }

  async function handleLeaveWaitlist() {
    await leaveWaitlist.mutateAsync({ sessionId: attendance.session_id });
    toast.success(t('common:join.leftWaitlist'));
  }

  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden ${isDeclined ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl shrink-0">{sportIcon}</span>
        <button onClick={() => navigate(`/player/training/${training?.id}`)} className="flex-1 min-w-0 text-left">
          <p className={`text-sm font-semibold truncate ${isDeclined ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{training?.name}</p>
          <span className="text-xs text-muted-foreground mt-0.5 block">
            {session?.start_time?.slice(0, 5)} – {session?.end_time?.slice(0, 5)}
          </span>
        </button>
        {/* Cancel / rejoin pill — hidden when confirmation is showing or session is in the past */}
        {!isPast && !showCancelWarning && !showRejoinConfirm && (
          isDeclined ? (
            <button
              onClick={handleRejoinClick}
              disabled={upsert.isPending}
              className="rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success shrink-0 disabled:opacity-50"
            >
              {t('calendar.rejoin')}
            </button>
          ) : isNoShow ? (
            <span className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive shrink-0">{t('calendar.noShow')}</span>
          ) : isPending ? (
            <span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 shrink-0">{t('calendar.standby')}</span>
          ) : (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <Check className="h-3 w-3" strokeWidth={3} /> {t('calendar.going')}
              </span>
              <button
                onClick={handleCancelClick}
                disabled={upsert.isPending}
                className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
              >
                {t('calendar.cancelAnyway')}
              </button>
            </div>
          )
        )}
        {/* Past sessions still show terminal status, but no actions */}
        {isPast && isNoShow && (
          <span className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive shrink-0">{t('calendar.noShow')}</span>
        )}
      </div>
      {isPending && !isPast && (
        <div className="px-4 py-2.5 border-t border-amber-200 bg-amber-50 space-y-2">
          <p className="text-xs text-amber-800 leading-snug">{t('calendar.standbyExplain')}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleChange('confirmed')}
              disabled={upsert.isPending}
              className="rounded-lg bg-success/15 px-3 py-1.5 text-xs font-semibold text-success disabled:opacity-50"
            >
              {t('calendar.claimSpot')}
            </button>
            <button
              onClick={handleLeaveWaitlist}
              disabled={leaveWaitlist.isPending}
              className="text-xs font-semibold text-amber-700 underline underline-offset-2 disabled:opacity-50"
            >
              {t('calendar.leaveWaitlist')}
            </button>
          </div>
        </div>
      )}
      <CalendarSessionFooter training={training} />

      {/* Rejoin confirmation — inline */}
      {showRejoinConfirm && (
        <div className="px-4 pb-3.5 border-t border-border pt-3">
          <div className="rounded-xl p-3.5 bg-muted/50 border border-border">
            <p className="text-sm text-foreground mb-3">{t('calendar.rejoinConfirm')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowRejoinConfirm(false)}
                className="rounded-lg bg-card border border-border py-2 text-xs font-semibold text-foreground min-h-[36px]"
              >
                {t('calendar.stayOut')}
              </button>
              <button
                onClick={() => handleChange('confirmed')}
                disabled={upsert.isPending}
                className="rounded-lg bg-success/15 py-2 text-xs font-semibold text-success min-h-[36px] disabled:opacity-50"
              >
                {t('calendar.rejoin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation — inline */}
      {showCancelWarning && (
        <div className="px-4 pb-3.5 border-t border-border pt-3">
          <div className={`rounded-xl p-3.5 ${isLateCancel ? 'bg-warning/8 border border-warning/20' : 'bg-muted/50 border border-border'}`}>
            {isLateCancel && (
              <div className="flex items-start gap-2.5 mb-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t('calendar.lateCancel', { hours: cancelDeadlineHours }) }} />
              </div>
            )}
            {!isLateCancel && (
              <p className="text-sm text-foreground mb-3">{t('calendar.cancelConfirm')}</p>
            )}
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

function CalendarSessionFooter({ training }: { training: any }) {
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
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => openExternal(e, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.venue)}`)}
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
