import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_LANGS, type SupportedLang } from '@/i18n';
import { Clock, Users, Mail, Calendar, CalendarDays, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { toast } from 'sonner';
import { SPORT_ICONS, DAYS_FULL as DAYS, dayLabel, sportLabel } from '@/lib/constants';
import { notifyUsers } from '@/lib/pushNotify';
import { getFixedTForLanguage } from '@/lib/notificationI18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { getEmailRedirectUrl } from '@/lib/auth-native';
import { signInWithGoogle, signInWithApple } from '@/lib/auth-providers';
import { useRequestPass, useTrainingRequiredPass } from '@/hooks/training/useAbonaments';

import Avatar from '@/components/shared/Avatar';
import VenueLink from '@/components/shared/VenueLink';
import AppHeader from '@/components/shared/AppHeader';
import { SessioLoader } from '@/components/SessioLogo';

export default function JoinTraining() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('common');

  const [training, setTraining] = useState<any>(null);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showRequestPassSheet, setShowRequestPassSheet] = useState(false);
  const [passStartDate, setPassStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const joiningRef = useRef(false);

  // Pass status for the current training (only meaningful once `training` and player are loaded).
  const passInfo = useTrainingRequiredPass(training);
  const requestPass = useRequestPass();

  async function applyInviteLanguage(lang?: string | null) {
    if (!lang || !SUPPORTED_LANGS.includes(lang as SupportedLang)) return;
    if (session) return;
    if (i18n.language === lang) return;
    await i18n.changeLanguage(lang);
    localStorage.setItem('sessio_lang', lang);
  }

  // Fetch training from invite_code
  useEffect(() => {
    if (!inviteCode) return;
    supabase
      .from('trainings')
      .select('*, coach:profiles(full_name, avatar_url, language)')
      .eq('invite_code', inviteCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          await applyInviteLanguage((data as any).coach?.language);
          setTraining(Object.assign({}, data as object, { _type: 'training' }));
        }
        setTrainingLoading(false);
      });
  }, [inviteCode, session, i18n]);

  // Fetch session info for one-off join (direct session link)
  useEffect(() => {
    if (!sessionParam || !training) return;
    supabase
      .from('training_sessions')
      .select('id, session_date, start_time, end_time, status')
      .eq('id', sessionParam)
      .eq('training_id', training.id)
      .eq('status', 'scheduled')
      .maybeSingle()
      .then(({ data }) => setSessionInfo(data));
  }, [sessionParam, training]);

  // Fetch upcoming sessions for session picker (via RPC — bypasses RLS for non-members)
  useEffect(() => {
    if (!training) return;
    supabase
      .rpc('get_upcoming_sessions', { p_training_id: training.id, p_limit: 8 })
      .then(({ data }) => setUpcomingSessions(data ?? []));
    // Fetch member count via RPC (RLS blocks cross-user reads on training_members)
    supabase
      .rpc('get_training_member_count', { p_training_id: training.id })
      .then(({ data }) => setMemberCount(data ?? 0));
  }, [training]);

  // In standalone PWA mode, detect when user returns from Google OAuth popup
  useEffect(() => {
    if (!googleLoading) return;
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      localStorage.removeItem('sessio_oauth_pwa');
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s) { window.location.reload(); return; }
        try {
          const ref = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
          if (localStorage.getItem(`sb-${ref}-auth-token`)) { window.location.reload(); return; }
        } catch {}
        setGoogleLoading(false);
      });
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [googleLoading]);

  // Redirect non-players and non-onboarded users
  useEffect(() => {
    if (!session || !profile || !training) return;
    if (loading) return;
    if (!profile.onboarding_complete || !profile.role) {
      sessionStorage.setItem('pending_invite', inviteCode ?? '');
      sessionStorage.setItem('pending_invite_ts', String(Date.now()));
      navigate('/onboarding');
      return;
    }
    if (profile.role !== 'player') {
      navigate('/coach');
      return;
    }
  }, [loading, session, profile, training]);

  async function handleJoinSession(sessionId: string) {
    if (!training || !profile) return;
    if (joiningRef.current) return;
    joiningRef.current = true;
    setJoiningSessionId(sessionId);
    try {
      const { data: existingAtt } = await supabase
        .from('session_attendance')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (existingAtt) {
        toast.info(t('join.alreadyInSession'));
        navigate('/player');
        return;
      }
      const { error } = await supabase.rpc('join_single_session', { p_session_id: sessionId });
      if (error) {
        if (error.message?.includes('PASS_REQUIRED')) {
          // Drop the user back to the join page where the request-pass UI is rendered.
          toast.info(t('join.passRequiredToast'));
          // Stay on this page — clear the session param so the recurring view shows the request UI.
          if (sessionParam) navigate(`/join/${inviteCode}`, { replace: true });
          return;
        }
        if (error.message?.includes('Drop-ins not allowed')) {
          toast.error(t('join.dropInNotAllowed'));
        } else if (error.message?.includes('Trial session already used')) {
          toast.error(t('join.trialUsed'));
        } else if (error.message?.includes('full')) {
          toast.error(t('join.sessionFull'));
        } else if (error.message?.includes('duplicate') || error.code === '23505') {
          toast.info(t('join.alreadyInSession'));
        } else {
          throw error;
        }
        navigate('/player');
        return;
      }
      if (training.coach_id) {
        const tCoach = getFixedTForLanguage(training.coach?.language);
        notifyUsers([training.coach_id], {
          title: tCoach('join.guestJoinedTitle'),
          body: tCoach('join.guestJoinedBody', {
            name: profile.full_name ?? tCoach('join.anonymousParticipant'),
            training: training.name,
          }),
          tag: `guest-${sessionId}`,
          url: `/coach/sessions/${sessionId}`,
        });
      }
      queryClient.removeQueries({ queryKey: ['my-upcoming-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      // Drop-in deducts a pass entry via the DB charge trigger.
      queryClient.invalidateQueries({ queryKey: ['my-school-abonament'] });
      queryClient.invalidateQueries({ queryKey: ['my-abonaments'] });
      queryClient.invalidateQueries({ queryKey: ['school-abonaments'] });
      toast.success(t('join.joinedSession', { name: training.name }));
      navigate('/player');
    } catch (err: any) {
      toast.error(localizeErrorMessage(err, t('join.failedToJoin')));
      navigate('/player');
    } finally {
      joiningRef.current = false;
      setJoiningSessionId(null);
    }
  }

  async function handleJoinAllSessions() {
    // Router: ?session= mode short-circuits to single-session join.
    if (sessionParam && sessionInfo) {
      await handleJoinSession(sessionParam);
      return;
    }
    await handleJoinRecurring();
  }

  async function handleJoinRecurring() {
    if (!training || !profile) return;
    if (joiningRef.current) return;
    // Pass-required gate: athlete must hold an active pass before signing up.
    if (training.required_pass_type_id && !passInfo.data?.activePass) {
      setShowRequestPassSheet(true);
      return;
    }
    joiningRef.current = true;
    setJoining(true);
    try {
      if (training._type === 'training') {
        const { data: existing } = await supabase
          .from('training_members')
          .select('id, role')
          .eq('training_id', training.id)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (existing) {
          toast.info(existing.role === 'waitlist' ? t('join.alreadyOnWaitlist') : t('join.alreadyInTraining'));
          navigate('/player');
          return;
        }

        const { count: activeCount } = await supabase
          .from('training_members')
          .select('*', { count: 'exact', head: true })
          .eq('training_id', training.id)
          .eq('role', 'regular');

        const isFull = training.max_players && (activeCount ?? 0) >= training.max_players;
        if (isFull && !training.allow_waitlist) {
          toast.error(t('join.trainingFull'));
          navigate('/player');
          return;
        }

        // If approval required, create a join request instead
        if (training.booking_mode === 'approval') {
          // Check if request already exists
          const { data: existingReq } = await supabase
            .from('join_requests')
            .select('id, status')
            .eq('user_id', profile.id)
            .eq('training_id', training.id)
            .maybeSingle();
          if (existingReq) {
            if (existingReq.status === 'pending') {
              toast.info(t('join.requestAlreadySent'));
              navigate('/player');
              return;
            }
            // Declined or accepted — allow re-requesting
            await supabase
              .from('join_requests')
              .update({ status: 'pending', created_at: new Date().toISOString() })
              .eq('id', existingReq.id);
            if (training.coach_id) {
              const tCoach = getFixedTForLanguage(training.coach?.language);
              notifyUsers([training.coach_id], {
                title: tCoach('join.requestNotificationTitle'),
                body: tCoach('join.requestNotificationBody', {
                  name: profile.full_name ?? tCoach('join.anonymousParticipant'),
                  training: training.name,
                }),
                tag: `join-req-${training.id}`,
                url: `/coach/trainings/${training.id}`,
              });
            }
            queryClient.invalidateQueries({ queryKey: ['my-join-requests'] });
            toast.success(t('join.joinRequestSentAgain'));
            navigate('/player');
            return;
          }
          const { error } = await supabase
            .from('join_requests')
            .insert({ user_id: profile.id, training_id: training.id, status: 'pending' });
          if (error) throw error;
          // Notify coach about the join request
          if (training.coach_id) {
            const tCoach = getFixedTForLanguage(training.coach?.language);
            notifyUsers([training.coach_id], {
              title: tCoach('join.requestNotificationTitle'),
              body: tCoach('join.requestNotificationBody', {
                name: profile.full_name ?? tCoach('join.anonymousParticipant'),
                training: training.name,
              }),
              tag: `join-req-${training.id}`,
              url: `/coach/trainings/${training.id}`,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['my-join-requests'] });
          toast.success(t('join.joinRequestSent'));
          navigate('/player');
          return;
        }

        const memberRole = isFull ? 'waitlist' : 'regular';
        const { error } = await supabase
          .from('training_members')
          .insert({ training_id: training.id, user_id: profile.id, role: memberRole });
        if (error) {
          if (error.code === '23505') {
            toast.info(t('join.alreadyInTraining'));
            navigate('/player');
            return;
          }
          throw error;
        }
        // Notify coach about the new member
        if (training.coach_id) {
          const tCoach = getFixedTForLanguage(training.coach?.language);
          notifyUsers([training.coach_id], {
            title: tCoach('join.memberJoinedTitle'),
            body: tCoach('join.memberJoinedBody', {
              name: profile.full_name ?? tCoach('join.anonymousParticipant'),
              training: training.name,
            }),
            tag: `joined-${training.id}`,
            url: `/coach/trainings/${training.id}`,
          });
        }
        queryClient.removeQueries({ queryKey: ['my-upcoming-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
        // Becoming a regular cascades into auto-attendance INSERTs which deduct passes via the trigger.
        queryClient.invalidateQueries({ queryKey: ['my-school-abonament'] });
        queryClient.invalidateQueries({ queryKey: ['my-abonaments'] });
        queryClient.invalidateQueries({ queryKey: ['school-abonaments'] });
        toast.success(memberRole === 'waitlist' ? t('join.addedToWaitlist') : t('join.joinedTraining', { name: training.name }));
        navigate('/player');
      }
    } catch (err: any) {
      toast.error(localizeErrorMessage(err, t('join.failedToJoin')));
      navigate('/player');
    } finally {
      joiningRef.current = false;
    }
  }

  function captureInvite() {
    sessionStorage.setItem('pending_invite', inviteCode ?? '');
    sessionStorage.setItem('pending_invite_ts', String(Date.now()));
    if (sessionParam) sessionStorage.setItem('pending_invite_session', sessionParam);
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    captureInvite();
    const { error, inPlaceSession } = await signInWithGoogle();
    if (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!/cancel/i.test(msg)) {
        toast.error(t('join.signInFailed'));
      }
      setGoogleLoading(false);
      return;
    }
    if (inPlaceSession) {
      navigate('/auth/callback');
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true);
    captureInvite();
    const { error, inPlaceSession } = await signInWithApple();
    if (error) {
      // iOS native sheet cancels surface as ASAuthorizationError code 1001 — silent dismiss.
      const msg = error instanceof Error ? error.message : String(error);
      if (!/cancel|1001/i.test(msg)) {
        toast.error(t('join.signInFailed'));
      }
      setAppleLoading(false);
      return;
    }
    if (inPlaceSession) {
      // Native iOS: session is already live → re-route through the callback.
      navigate('/auth/callback');
    }
    // Web: browser is redirecting away — leave spinner on.
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    captureInvite();
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: getEmailRedirectUrl() },
    });
    if (error) toast.error(localizeErrorMessage(error, t('join.failedToJoin')));
    else setEmailSent(true);
  }

  if (trainingLoading || (loading && session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <SessioLoader />
      </div>
    );
  }

  if (!training) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-foreground">{t('join.notFound')}</h2>
        <p className="mt-2 text-muted-foreground">{t('join.notFoundDesc')}</p>
        <button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground min-h-[44px]">{t('join.goHome')}</button>
      </div>
    );
  }

  const coach = training.coach;
  const sportIcon = SPORT_ICONS[training.sport] ?? '🎯';

  const timeRange = [training.start_time?.slice(0, 5), training.end_time?.slice(0, 5)].filter(Boolean).join(' – ');

  const TrainingDetails = () => (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-4xl">{sportIcon}</span>
        <div>
          <h2 className="text-xl font-bold text-foreground">{training.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground">{sportLabel(training.sport)}</span>
            {training.type && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                training.type === 'individual' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
              }`}>{t(`common:trainingType.${training.type}`)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {sessionInfo ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{format(new Date(sessionInfo.session_date + 'T00:00:00'), 'EEEE, d MMM', { locale: getDateLocale() })} {t('join.at')} {sessionInfo.start_time?.slice(0, 5)} – {sessionInfo.end_time?.slice(0, 5)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{dayLabel(DAYS[(training.day_of_week ?? 0)])} {t('join.at')} {timeRange}</span>
          </div>
        )}
        {(training.venue || training.location) && (
          <div className="text-sm">
            <VenueLink venue={training.venue ?? training.location} className="text-foreground" />
          </div>
        )}
        {training.max_players && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{memberCount != null ? `${memberCount}/${training.max_players}` : training.max_players}</span>
          </div>
        )}
      </div>
    </div>
  );

  // Logged-in view — show sessions, let player choose
  if (session && profile?.onboarding_complete && profile?.role === 'player') {
    const isApproval = training.booking_mode === 'approval';
    const allowDropIn = training.drop_in_policy !== 'none';

    // ── Pass-required UI helpers ─────────────────────────────────
    const requiredPass = passInfo.data?.requiredType ?? null;
    const activePass = passInfo.data?.activePass ?? null;
    const pendingPass = passInfo.data?.pendingPass ?? null;
    const requiresPass = !!training.required_pass_type_id;
    const passLoading = requiresPass && passInfo.isLoading;
    const passDetail = (() => {
      if (!requiredPass) return '';
      const parts: string[] = [];
      if (requiredPass.sessions_count) parts.push(`${requiredPass.sessions_count}x`);
      if (requiredPass.duration_days) parts.push(`${requiredPass.duration_days}d`);
      if (requiredPass.price != null) parts.push(`${requiredPass.price} ${requiredPass.currency}`);
      return parts.join(' · ');
    })();
    const PassRequiredCard = () => requiresPass && requiredPass ? (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm font-semibold text-foreground">{t('join.passRequiredTitle')}</p>
        </div>
        <p className="text-sm font-medium text-foreground">{requiredPass.name}{passDetail && <span className="text-muted-foreground"> · {passDetail}</span>}</p>
        <p className="text-xs text-muted-foreground">
          {t('join.passRequiredDescription', { coach: coach?.full_name ?? '', pass: requiredPass.name })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('join.passWorksForAllOfThisCoach', { coach: coach?.full_name ?? '' })}
        </p>
      </div>
    ) : null;
    // The CTA renderer returns null when the existing primary button should still be shown.
    function renderPassCta(onCancel?: () => void) {
      if (!requiresPass) return null;
      if (passLoading) {
        return (
          <button disabled className="w-full rounded-2xl bg-muted py-4 text-lg font-bold text-muted-foreground min-h-[56px]">
            {t('join.joining')}
          </button>
        );
      }
      if (activePass) return null; // existing CTA will render
      if (pendingPass) {
        return (
          <button disabled className="w-full rounded-2xl bg-muted py-4 text-lg font-bold text-muted-foreground min-h-[56px]">
            {t('join.passApprovalPending')}
          </button>
        );
      }
      // Used-up / expired: fall through to no-pass CTA but with different label.
      // We can't easily distinguish here; the request flow handles both.
      return (
        <button
          onClick={() => setShowRequestPassSheet(true)}
          className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground min-h-[56px] active:opacity-80 transition-opacity"
        >
          {t('join.requestPass')}
        </button>
      );
    }

    // Direct session link — single session view
    if (sessionParam && sessionInfo) {
      const passCta = renderPassCta();
      return (
        <div className="flex min-h-screen flex-col bg-background">
          <AppHeader title={training.name} back />
          <main className="flex-1 px-4 py-6 max-w-sm mx-auto w-full space-y-4">
            <TrainingDetails />
            {coach?.full_name && (
              <div className="flex items-center gap-3 px-1">
                <Avatar url={coach.avatar_url} name={coach.full_name} size="md" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{coach.full_name}</p>
                  {training.sport && <p className="text-xs text-muted-foreground">{sportLabel(training.sport)}</p>}
                </div>
              </div>
            )}
            <PassRequiredCard />
            {training.drop_in_policy === 'trial' && (
              <p className="text-xs text-muted-foreground text-center px-4">{t('join.trialNote')}</p>
            )}
            <p className="text-xs text-muted-foreground text-center px-4">{t('join.passDeductionNote')}</p>
            {passCta ?? (
              <button
                onClick={() => handleJoinSession(sessionParam)}
                disabled={!!joiningSessionId || joining}
                className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
              >
                {joiningSessionId ? t('join.joining') : t('join.joinSessionOn', { name: training.name, date: format(new Date(sessionInfo.session_date + 'T00:00:00'), 'd MMM', { locale: getDateLocale() }) })}
              </button>
            )}
            {!passCta && training.is_recurring === true && (
              <button
                onClick={handleJoinRecurring}
                disabled={!!joiningSessionId || joining}
                className="w-full rounded-2xl border border-border bg-card py-4 text-base font-semibold text-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
              >
                {joining ? t('join.joining') : isApproval ? t('join.requestWeekly') : t('join.signUpWeekly')}
              </button>
            )}
          </main>
          {showRequestPassSheet && requiredPass && (
            <RequestPassSheet
              passType={requiredPass}
              coachId={passInfo.data?.coachId ?? training.coach_id ?? null}
              schoolId={requiredPass.school_id}
              trainingId={training.id}
              startDate={passStartDate}
              onStartDateChange={setPassStartDate}
              onClose={() => setShowRequestPassSheet(false)}
              submitting={requestPass.isPending}
              onSubmit={async () => {
                await requestPass.mutateAsync({
                  abonamentTypeId: requiredPass.id,
                  schoolId: requiredPass.school_id,
                  typeName: requiredPass.name,
                  startDate: passStartDate,
                  trainingId: training.id,
                  requestingCoachId: passInfo.data?.coachId ?? training.coach_id ?? undefined,
                });
                setShowRequestPassSheet(false);
              }}
            />
          )}
        </div>
      );
    }

    // Default view — show all sessions + sign up options
    const passCta = renderPassCta();
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title={training.name} back />
        <main className="flex-1 px-4 py-6 max-w-sm mx-auto w-full space-y-4">
          <TrainingDetails />

          {coach?.full_name && (
            <div className="flex items-center gap-3 px-1">
              <Avatar url={coach.avatar_url} name={coach.full_name} size="md" />
              <div>
                <p className="text-sm font-semibold text-foreground">{coach.full_name}</p>
                {training.sport && <p className="text-xs text-muted-foreground">{sportLabel(training.sport)}</p>}
              </div>
            </div>
          )}

          <PassRequiredCard />

          <p className="text-xs text-muted-foreground text-center px-4">{t('join.passDeductionNote')}</p>

          {/* Primary: sign up for all sessions (or request the required pass) */}
          {passCta ?? (
            <button
              onClick={handleJoinAllSessions}
              disabled={joining}
              className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
            >
              {joining ? t('join.joining') : isApproval ? t('join.requestToJoin') : t('join.signUpAll')}
            </button>
          )}

          {/* Individual sessions — if drop-ins allowed and no pending pass blocker */}
          {!passCta && allowDropIn && upcomingSessions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t('join.orPickSession')}</p>
              {training.drop_in_policy === 'trial' && (
                <p className="text-xs text-muted-foreground mb-2">{t('join.trialNote')}</p>
              )}
              <div className="space-y-1.5">
                {upcomingSessions.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => handleJoinSession(s.id)}
                    disabled={!!joiningSessionId}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left active:bg-muted/50 transition-colors disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(s.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() })}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</p>
                    </div>
                    <span className="text-xs font-medium text-primary shrink-0">
                      {joiningSessionId === s.id ? t('join.joining') : t('join.signUp')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
        {showRequestPassSheet && requiredPass && (
          <RequestPassSheet
            passType={requiredPass}
            coachId={passInfo.data?.coachId ?? training.coach_id ?? null}
            schoolId={requiredPass.school_id}
            trainingId={training.id}
            startDate={passStartDate}
            onStartDateChange={setPassStartDate}
            onClose={() => setShowRequestPassSheet(false)}
            submitting={requestPass.isPending}
            onSubmit={async () => {
              await requestPass.mutateAsync({
                abonamentTypeId: requiredPass.id,
                schoolId: requiredPass.school_id,
                typeName: requiredPass.name,
                startDate: passStartDate,
                trainingId: training.id,
                requestingCoachId: passInfo.data?.coachId ?? training.coach_id ?? undefined,
              });
              setShowRequestPassSheet(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center header-gradient px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-white">sessio</span>
      </header>
      <main className="flex-1 px-4 py-8 space-y-5 max-w-sm mx-auto w-full">
        {coach?.full_name ? (
          <div className="text-center">
            <div className="mx-auto mb-3">
              <Avatar url={coach.avatar_url} name={coach.full_name} size="xl" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('join.invitedToJoin', { name: coach.full_name })}
            </p>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">{t('join.beenInvitedToJoin')}</p>
        )}

        <TrainingDetails />

        <p className="text-center text-sm text-muted-foreground">{t('join.joinIn30Seconds')}</p>

        {emailSent ? (
          <div className="rounded-2xl bg-success/10 border border-success/20 p-5 text-center">
            <div className="mb-2 text-3xl">📩</div>
            <p className="font-semibold text-foreground">{t('join.checkEmail')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('join.sentMagicLink')} <strong>{email}</strong></p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleAppleSignIn}
              disabled={appleLoading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black py-4 text-base font-bold text-white min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
            >
              {appleLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  {t('auth:auth.continueApple')}
                </>
              )}
            </button>

            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || appleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
            >
              {googleLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('join.continueGoogle')}
                </>
              )}
            </button>

            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-medium text-foreground min-h-[44px]"
              >
                <Mail className="h-4 w-4" />
                {t('join.continueEmail')}
              </button>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email" required placeholder={t('auth:auth.emailPlaceholder')} value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                />
                <button type="submit" className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background min-h-[44px]">
                  {t('join.sendMagicLink')}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface RequestPassSheetProps {
  passType: {
    id: string;
    name: string;
    sessions_count: number | null;
    duration_days: number | null;
    price: number | null;
    currency: string;
  };
  coachId: string | null;
  schoolId: string;
  trainingId: string;
  startDate: string;
  onStartDateChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
}

function RequestPassSheet({ passType, startDate, onStartDateChange, onClose, onSubmit, submitting }: RequestPassSheetProps) {
  const { t } = useTranslation('common');
  const details: string[] = [];
  if (passType.sessions_count) details.push(`${passType.sessions_count}x`);
  if (passType.duration_days) details.push(`${passType.duration_days}d`);
  if (passType.price != null) details.push(`${passType.price} ${passType.currency}`);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm">{t('join.requestPassSheetTitle', { pass: passType.name })}</h3>
            {details.length > 0 && <p className="text-xs text-muted-foreground truncate">{details.join(' · ')}</p>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary shrink-0">
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('join.requestPassSheetStartLabel')}</label>
            <input
              type="date"
              value={startDate}
              onChange={e => onStartDateChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={submitting || !startDate}
            className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
          >
            {submitting ? t('join.joining') : t('join.requestPassSheetCta')}
          </button>
        </div>
      </div>
    </>
  );
}
