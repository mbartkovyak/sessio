import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { SPORT_ICONS } from '@/lib/constants';
import CalendarGrid from '@/components/shared/CalendarGrid';
import Avatar from '@/components/shared/Avatar';
import SignUpSheet from '@/components/shared/SignUpSheet';
import {
  useMyAttendanceForSessions,
  useUpsertAttendance,
} from '@/hooks/training/useTrainings';
import type { PublicUpcomingSession } from '@/hooks/school/useSchools';

interface Props {
  sessions: PublicUpcomingSession[];
  isLoading: boolean;
  showCoach?: boolean;
  emptyState: ReactNode;
}

export default function UpcomingSessionsCalendar({ sessions, isLoading, showCoach = false, emptyState }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [signUpFor, setSignUpFor] = useState<PublicUpcomingSession | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // RPC filters by session_date >= today, but same-day sessions whose end_time
  // has already passed shouldn't be sign-up- or cancel-able. Drop them here.
  const upcoming = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const nowTime = format(now, 'HH:mm:ss');
    return sessions.filter(s => {
      if (s.session_date > today) return true;
      if (s.session_date < today) return false;
      return (s.end_time ?? '23:59:59') > nowTime;
    });
  }, [sessions]);

  const sessionIds = useMemo(() => upcoming.map(s => s.session_id), [upcoming]);
  const { data: attendance = {} } = useMyAttendanceForSessions(sessionIds);
  const upsertAttendance = useUpsertAttendance();

  function openDetails(s: PublicUpcomingSession) {
    // Card body opens the existing JoinTraining page in default mode — that's the
    // training-details surface (sport, schedule, capacity, coach card, sign-up CTAs).
    navigate(`/join/${s.invite_code}`);
  }

  async function handleCancel(s: PublicUpcomingSession) {
    setCancellingId(s.session_id);
    try {
      await upsertAttendance.mutateAsync({
        sessionId: s.session_id,
        status: 'declined',
        notify: { coachId: s.coach_id, trainingName: s.training_name, trainingId: s.training_id },
      });
      toast.success(t('toast.sessionCancelled'));
    } catch {
      // hook's onError already toasted
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <>
      <CalendarGrid<PublicUpcomingSession>
        items={upcoming}
        getDate={(s) => s.session_date}
        isLoading={isLoading}
        emptyState={emptyState}
        renderItem={(s) => {
          const isConfirmed = attendance[s.session_id] === 'confirmed';
          const isPending = attendance[s.session_id] === 'pending';
          const busy = cancellingId === s.session_id;
          const max = s.max_players;
          const taken = s.confirmed_count ?? 0;
          const isFull = max != null && taken >= max;
          const allowWaitlist = s.allow_waitlist !== false; // null/true → allow
          return (
            <div
              key={s.session_id}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card pl-4 pr-2 py-2 shadow-sm"
            >
              <button
                type="button"
                onClick={() => openDetails(s)}
                className="flex flex-1 min-w-0 items-center gap-3 py-1.5 text-left active:opacity-70 transition-opacity"
              >
                <span className="text-xl shrink-0">{SPORT_ICONS[s.sport] ?? '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{s.training_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                    {max != null && (() => {
                      // Don't flash "Заповнено" at people who already hold a
                      // seat (or waitlist slot) — they're in, the message
                      // doesn't apply to them. Just show the count.
                      const viewerIsIn = isConfirmed || isPending;
                      const showFullLabel = isFull && !viewerIsIn;
                      return (
                        <span className={`ml-2 font-medium ${showFullLabel ? 'text-amber-700' : 'text-muted-foreground'}`}>
                          · {showFullLabel ? t('capacity.full') : `${taken}/${max}`}
                        </span>
                      );
                    })()}
                  </p>
                  {showCoach && s.coach_name && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Avatar url={s.coach_avatar_url} name={s.coach_name} size="xs" />
                      <span className="text-xs font-medium text-primary truncate">{s.coach_name}</span>
                    </div>
                  )}
                </div>
              </button>
              {isConfirmed ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel(s);
                  }}
                  disabled={busy}
                  className="shrink-0 rounded-full bg-destructive/10 px-3.5 py-2 text-xs font-bold text-destructive min-h-[36px] disabled:opacity-60 active:opacity-80 transition-opacity"
                >
                  {t('actions.cancel')}
                </button>
              ) : isPending ? (
                <span className="shrink-0 rounded-full bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-700 min-h-[36px] flex items-center">
                  {t('calendar.standby', { ns: 'player' })}
                </span>
              ) : isFull && !allowWaitlist ? (
                <span className="shrink-0 rounded-full bg-muted px-3.5 py-2 text-xs font-bold text-muted-foreground min-h-[36px] flex items-center">
                  {t('capacity.full')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSignUpFor(s);
                  }}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold min-h-[36px] active:opacity-80 transition-opacity ${
                    isFull ? 'bg-amber-500/15 text-amber-700' : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {isFull ? t('join.joinWaitlist') : t('join.signUp')}
                </button>
              )}
            </div>
          );
        }}
      />

      {signUpFor && (
        <SignUpSheet session={signUpFor} onClose={() => setSignUpFor(null)} />
      )}
    </>
  );
}
