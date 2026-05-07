import { useEffect } from 'react';
import { X, Calendar, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useJoinSingleSession, useJoinTrainingRecurring } from '@/hooks/training/useTrainings';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { SPORT_ICONS } from '@/lib/constants';
import { notifyUsers } from '@/lib/pushNotify';
import { getFixedTForLanguage } from '@/lib/notificationI18n';

interface SessionInput {
  session_id: string;
  training_id: string;
  training_name: string;
  sport: string;
  invite_code: string;
  is_recurring: boolean | null;
  drop_in_policy: string;
  booking_mode: string;
  coach_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  max_players?: number | null;
  confirmed_count?: number | null;
  allow_waitlist?: boolean | null;
}

interface Props {
  session: SessionInput;
  onClose: () => void;
}

export default function SignUpSheet({ session, onClose }: Props) {
  const { t } = useTranslation('common');
  const { session: authSession, profile } = useAuth();
  const navigate = useNavigate();
  const joinOne = useJoinSingleSession();
  const joinRecurring = useJoinTrainingRecurring();

  // Logged-out viewer of a public school profile: hand off to the auth-aware /join page.
  useEffect(() => {
    if (!authSession || !profile) {
      navigate(`/join/${session.invite_code}?session=${session.session_id}`);
      onClose();
    }
  }, [authSession, profile, session.invite_code, session.session_id, navigate, onClose]);

  // Training row carries the fields the recurring-join hook needs (max_players,
  // allow_waitlist, booking_mode) plus coach language for the push notification.
  const { data: training } = useQuery({
    queryKey: ['training-row-for-join', session.training_id],
    enabled: !!authSession && !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('trainings')
        .select('id, name, coach_id, max_players, allow_waitlist, booking_mode, required_pass_type_id, coach:profiles!trainings_coach_id_fkey(language)')
        .eq('id', session.training_id)
        .maybeSingle();
      return data;
    },
  });

  // Effect handles the redirect; render nothing until then to avoid a flash of the sheet.
  if (!authSession || !profile) return null;

  const isRecurring = session.is_recurring === true;
  const allowSingle = session.drop_in_policy !== 'none';
  const showRecurring = isRecurring;
  const showSingle = !isRecurring || allowSingle;
  const isApproval = session.booking_mode === 'approval';

  const taken = session.confirmed_count ?? 0;
  const max = session.max_players ?? null;
  const isFull = max != null && taken >= max;
  const allowWaitlist = session.allow_waitlist !== false;
  // Drop-ins on full sessions: route to waitlist if training allows it,
  // otherwise the single-session button is hidden entirely.
  const singleDisabled = isFull && !allowWaitlist;

  const sessionLabel = `${format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() })} · ${session.start_time?.slice(0, 5)}–${session.end_time?.slice(0, 5)}`;

  async function handleSingle() {
    if (!profile) return;
    // Pre-check: join_single_session uses ON CONFLICT DO NOTHING, so a duplicate
    // would silently "succeed". Catch already-joined here for an honest toast.
    const { data: existingAtt } = await supabase
      .from('session_attendance')
      .select('id')
      .eq('session_id', session.session_id)
      .eq('user_id', profile.id)
      .maybeSingle();
    if (existingAtt) {
      toast.info(t('join.alreadyInSession'));
      onClose();
      return;
    }
    try {
      await joinOne.mutateAsync({ sessionId: session.session_id });
      if (session.coach_id) {
        const tCoach = getFixedTForLanguage(training?.coach?.language);
        notifyUsers([session.coach_id], {
          title: tCoach('join.guestJoinedTitle'),
          body: tCoach('join.guestJoinedBody', {
            name: profile.full_name ?? tCoach('join.anonymousParticipant'),
            training: session.training_name,
          }),
          tag: `guest-${session.session_id}`,
          url: `/coach/sessions/${session.session_id}`,
        });
      }
      // The RPC silently routes a full session to the waitlist (status='pending')
      // when allow_waitlist=true. Pick the matching toast from what we knew at click time.
      if (isFull && allowWaitlist) {
        toast.success(t('join.addedToSessionWaitlist'));
      } else {
        toast.success(t('join.joinedSession', { name: session.training_name }));
      }
    } catch (err: any) {
      // PASS_REQUIRED comes from the join_single_session RPC: route the athlete to
      // the join page where the request-pass flow lives. The hook's onError
      // already showed the localized hint toast — just redirect.
      if (typeof err?.message === 'string' && err.message.includes('PASS_REQUIRED')) {
        navigate(`/join/${session.invite_code}?session=${session.session_id}`);
        onClose();
        return;
      }
      // hook's onError already toasted; fall through to close
    }
    onClose();
  }

  async function handleRecurring() {
    if (!training) return;
    // Hook handles toasts on every branch (alreadyIn / full / requestSent / joined / error / passRequired).
    const result = await joinRecurring.mutateAsync({ training }).catch(() => null);
    // passRequired → bounce to the training page where the request-pass UI lives.
    if (result?.kind === 'passRequired') {
      navigate(`/join/${session.invite_code}`);
    }
    onClose();
  }

  const busy = joinOne.isPending || joinRecurring.isPending;
  const recurringDisabled = busy || !training;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md rounded-t-2xl bg-card p-6 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{SPORT_ICONS[session.sport] ?? '🎯'}</span>
          <h3 className="text-lg font-bold text-foreground">{session.training_name}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {sessionLabel}
          {max != null && (
            <span className={`ml-2 font-medium ${isFull ? 'text-amber-700' : ''}`}>
              · {isFull ? t('capacity.full') : `${taken}/${max}`}
            </span>
          )}
        </p>

        <div className="space-y-2.5">
          {showSingle && !singleDisabled && (
            <button
              onClick={handleSingle}
              disabled={busy}
              className={`w-full flex items-center gap-3 rounded-2xl px-4 py-4 text-base font-bold min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity ${
                isFull ? 'bg-amber-500/15 text-amber-700' : 'bg-primary text-primary-foreground'
              }`}
            >
              <Calendar className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">
                {joinOne.isPending
                  ? t('join.joining')
                  : isFull
                    ? t('signUp.joinSessionWaitlist')
                    : t('signUp.justThisSession')}
              </span>
            </button>
          )}

          {showRecurring && (
            <button
              onClick={handleRecurring}
              disabled={recurringDisabled}
              className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-base font-semibold text-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
            >
              <Repeat className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">
                {joinRecurring.isPending
                  ? t('join.joining')
                  : isApproval
                    ? t('join.requestWeekly')
                    : t('signUp.everyWeek')}
              </span>
            </button>
          )}
        </div>

        {session.drop_in_policy === 'trial' && (
          <p className="mt-3 text-xs text-muted-foreground text-center">{t('join.trialNote')}</p>
        )}
      </div>
    </div>
  );
}
