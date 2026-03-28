import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_LANGS, type SupportedLang } from '@/i18n';
import { Clock, Users, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { SPORT_ICONS, DAYS_FULL as DAYS, dayLabel, sportLabel } from '@/lib/constants';
import { notifyUsers } from '@/lib/pushNotify';
import { getFixedTForLanguage } from '@/lib/notificationI18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';

import Avatar from '@/components/shared/Avatar';
import VenueLink from '@/components/shared/VenueLink';
import AppHeader from '@/components/shared/AppHeader';
import { SessioLoader } from '@/components/SessioLogo';

export default function JoinTraining() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('common');

  const [training, setTraining] = useState<any>(null);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const joiningRef = useRef(false);

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

  async function handleJoin() {
    if (!training || !profile) return;
    if (joiningRef.current) return;
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
        queryClient.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
        toast.success(memberRole === 'waitlist' ? t('join.addedToWaitlist') : t('join.joinedTraining', { name: training.name }));
        navigate('/player');
      } else {
        // Legacy group join
        const { data: existing } = await supabase.from('group_members').select('id, status').eq('group_id', training.id).eq('player_id', profile.id).maybeSingle();
        if (existing) { toast.info(t('join.alreadyInGroup')); navigate('/player'); return; }
        const { count: activeCount } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', training.id).eq('status', 'active');
        const isFull = (activeCount ?? 0) >= training.capacity;
        const status = (isFull && training.allow_waitlist) ? 'waitlist' : isFull ? null : 'active';
        if (!status) { toast.error(t('join.groupFull')); navigate('/player'); return; }
        await supabase.from('group_members').insert({ group_id: training.id, player_id: profile.id, status });
        toast.success(t('join.joinedTraining', { name: training.name }));
        navigate('/player');
      }
    } catch (err: any) {
      toast.error(localizeErrorMessage(err, t('join.failedToJoin')));
      navigate('/player');
    } finally {
      joiningRef.current = false;
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    sessionStorage.setItem('pending_invite', inviteCode ?? '');
    sessionStorage.setItem('pending_invite_ts', String(Date.now()));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) { toast.error(t('join.signInFailed')); setGoogleLoading(false); }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('pending_invite', inviteCode ?? '');
    sessionStorage.setItem('pending_invite_ts', String(Date.now()));
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin + '/auth/callback' },
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
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{dayLabel(DAYS[(training.day_of_week ?? 0)])} {t('join.at')} {timeRange}</span>
        </div>
        {(training.venue || training.location) && (
          <div className="text-sm">
            <VenueLink venue={training.venue ?? training.location} className="text-foreground" />
          </div>
        )}
        {training.max_players && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{t('join.spotsPerTraining', { count: training.max_players })}</span>
          </div>
        )}
      </div>
    </div>
  );

  // Logged-in view — training detail page with explicit join button
  if (session && profile?.onboarding_complete && profile?.role === 'player') {
    const isApproval = training.booking_mode === 'approval';
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

          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
          >
            {joining ? t('join.joining') : isApproval ? t('join.requestToJoin') : t('join.joinName', { name: training.name })}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
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
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
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
