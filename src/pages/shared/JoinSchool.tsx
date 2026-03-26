import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_LANGS, type SupportedLang } from '@/i18n';
import { Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import { sportLabel } from '@/lib/constants';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function JoinSchool() {
  const { code } = useParams<{ code: string }>();
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('common');

  const [school, setSchool] = useState<any>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function applyInviteLanguage(lang?: string | null) {
    if (!lang || !SUPPORTED_LANGS.includes(lang as SupportedLang)) return;
    if (session) return;
    if (i18n.language === lang) return;
    await i18n.changeLanguage(lang);
    localStorage.setItem('sessio_lang', lang);
  }

  // Fetch school by invite_code
  useEffect(() => {
    if (!code) return;
    supabase
      .from('schools')
      .select('id, name, sport, city, logo_url, invite_code, owner:profiles(language)')
      .eq('invite_code', code.toUpperCase())
      .maybeSingle()
      .then(async ({ data }) => {
        await applyInviteLanguage((data as any)?.owner?.language);
        setSchool(data);
        setSchoolLoading(false);
      });
  }, [code, session, i18n]);

  // Check status once auth resolves
  useEffect(() => {
    if (!session || !profile || !school) return;
    if (loading) return;
    if (!profile.onboarding_complete || !profile.role) {
      sessionStorage.setItem('pending_school_invite', code ?? '');
      navigate('/onboarding');
      return;
    }
    if (profile.role !== 'coach') {
      toast.error(t('joinSchool.onlyCoaches'));
      navigate(profile.role === 'player' ? '/player' : '/coach');
      return;
    }
    checkExisting();
  }, [loading, session, profile, school]);

  async function checkExisting() {
    if (!school || !profile) return;
    const { data: existing } = await supabase
      .from('school_members')
      .select('id, status')
      .eq('school_id', school.id)
      .eq('coach_id', profile.id)
      .maybeSingle();

    if (existing?.status === 'approved') {
      toast.info(t('joinSchool.alreadyInSchool'));
      navigate('/coach');
    } else if (existing?.status === 'pending') {
      setRequestSent(true);
    }
  }

  async function requestJoin() {
    if (!school || !profile) return;
    setJoining(true);
    try {
      const { error } = await supabase
        .from('school_members')
        .insert({ school_id: school.id, coach_id: profile.id, status: 'pending' });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['my-school'] });
      setRequestSent(true);
    } catch (err: any) {
      toast.error(localizeErrorMessage(err, t('joinSchool.failedToSend')));
      setJoining(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    sessionStorage.setItem('pending_school_invite', code ?? '');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) { toast.error(t('joinSchool.signInFailed')); setGoogleLoading(false); }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('pending_school_invite', code ?? '');
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) toast.error(localizeErrorMessage(error, t('joinSchool.failedToSend')));
    else setEmailSent(true);
  }

  if (schoolLoading || (loading && session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-foreground">{t('joinSchool.notFound')}</h2>
        <p className="mt-2 text-muted-foreground">{t('joinSchool.notFoundDesc')}</p>
        <button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground min-h-[44px]">{t('joinSchool.goHome')}</button>
      </div>
    );
  }

  const SchoolCard = () => (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <div className="mx-auto mb-3">
        <Avatar url={school.logo_url} name={school.name} size="2xl" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{school.name}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {[school.sport ? sportLabel(school.sport) : null, school.city].filter(Boolean).join(' · ')}
      </p>
    </div>
  );

  // Request sent — pending approval
  if (requestSent) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
        </header>
        <main className="flex-1 px-4 py-8 max-w-sm mx-auto w-full space-y-5">
          <SchoolCard />
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
            <Clock className="mx-auto h-8 w-8 text-amber-500 mb-2" />
            <p className="font-semibold text-foreground">{t('joinSchool.requestSent')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('joinSchool.requestSentDesc')}</p>
          </div>
          <button
            onClick={() => navigate('/coach')}
            className="w-full rounded-2xl border border-border py-3.5 text-sm font-medium text-foreground min-h-[44px]"
          >
            {t('joinSchool.goToDashboard')}
          </button>
        </main>
      </div>
    );
  }

  // Logged-in coach — request to join
  if (session && profile?.onboarding_complete && profile?.role === 'coach') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
        </header>
        <main className="flex-1 px-4 py-8 max-w-sm mx-auto w-full space-y-5">
          <p className="text-center text-sm text-muted-foreground">{t('joinSchool.invitedToJoin')}</p>
          <SchoolCard />
          <button
            onClick={requestJoin}
            disabled={joining}
            className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
          >
            {joining ? t('joinSchool.sendingRequest') : t('joinSchool.requestToJoin')}
          </button>
          <p className="text-center text-xs text-muted-foreground">{t('joinSchool.ownerWillApprove')}</p>
        </main>
      </div>
    );
  }

  // Not logged in — sign-in flow
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
      </header>
      <main className="flex-1 px-4 py-8 space-y-5 max-w-sm mx-auto w-full">
        <p className="text-center text-sm text-muted-foreground">{t('joinSchool.invitedToJoin')}</p>
        <SchoolCard />
        <p className="text-center text-sm text-muted-foreground">{t('joinSchool.signInToJoin')}</p>

        {emailSent ? (
          <div className="rounded-2xl bg-success/10 border border-success/20 p-5 text-center">
            <div className="mb-2 text-3xl">📩</div>
            <p className="font-semibold text-foreground">{t('joinSchool.checkEmail')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('joinSchool.sentMagicLink')} <strong>{email}</strong></p>
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
                  {t('joinSchool.continueGoogle')}
                </>
              )}
            </button>

            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-medium text-foreground min-h-[44px]"
              >
                <Mail className="h-4 w-4" />
                {t('joinSchool.continueEmail')}
              </button>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email" required placeholder={t('auth:auth.emailPlaceholder')} value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                />
                <button type="submit" className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background min-h-[44px]">
                  {t('joinSchool.sendMagicLink')}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
