import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { SessioLoader, SessioLogoCompact } from '@/components/SessioLogo';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { session, profile, loading, refreshProfile } = useAuth();
  const { t } = useTranslation('auth');
  const [pwaReturn, setPwaReturn] = useState(false);
  const [profileAttempts, setProfileAttempts] = useState(0);
  // 4 total tries (0 = initial, then 3 retries) at 0s, 5s, 15s — bounded ~20s
  // of waiting plus each fetchProfile's own internal retries on top.
  const MAX_PROFILE_ATTEMPTS = 4;

  useEffect(() => {
    if (loading) return;

    // If opened from PWA standalone popup, try to close this browser tab
    const oauthFromPwa = localStorage.getItem('sessio_oauth_pwa');
    if (oauthFromPwa) {
      localStorage.removeItem('sessio_oauth_pwa');
      if (!window.matchMedia('(display-mode: standalone)').matches && profile) {
        window.close();
        // window.close() may be ignored — show a return message as fallback
        setPwaReturn(true);
        return;
      }
    }

    // No session at all → user isn't signed in, go to sign-in.
    if (!session) {
      navigate('/auth/sign-in');
      return;
    }

    // Session exists but profile didn't load. Two known causes:
    //   1. JWT race after fresh sign-in — usually resolves on first retry.
    //   2. Postgres statement timeout under DB pressure — needs longer backoff.
    // Don't navigate away: the user IS authenticated. Bouncing to /auth/sign-in
    // makes them think they got logged out when they didn't.
    if (!profile) {
      if (profileAttempts >= MAX_PROFILE_ATTEMPTS) return; // render error UI below
      const delay = profileAttempts === 0 ? 0 : profileAttempts === 1 ? 5000 : 15000;
      const timer = setTimeout(() => {
        refreshProfile().finally(() => setProfileAttempts(a => a + 1));
      }, delay);
      return () => clearTimeout(timer);
    }

    if (!profile.onboarding_complete || !profile.role) {
      navigate('/onboarding');
      return;
    }

    if (!profile.questionnaire_complete) {
      navigate('/onboarding/questionnaire');
      return;
    }

    // Check for pending invites
    const pendingSchoolInvite = sessionStorage.getItem('pending_school_invite');
    if (pendingSchoolInvite) {
      sessionStorage.removeItem('pending_school_invite');
      navigate(`/join-school/${pendingSchoolInvite}`);
      return;
    }
    const pendingInvite = sessionStorage.getItem('pending_invite');
    if (pendingInvite) {
      const pendingSession = sessionStorage.getItem('pending_invite_session');
      sessionStorage.removeItem('pending_invite');
      sessionStorage.removeItem('pending_invite_ts');
      sessionStorage.removeItem('pending_invite_session');
      const sessionSuffix = pendingSession ? `?session=${pendingSession}` : '';
      navigate(`/join/${pendingInvite}${sessionSuffix}`);
      return;
    }

    navigate(profile.role === 'player' ? '/player' : '/coach');
  }, [loading, session, profile, profileAttempts, refreshProfile, navigate]);

  if (pwaReturn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center px-6">
          <div className="mb-6"><SessioLogoCompact /></div>
          <p className="font-medium text-foreground">{t('auth.authComplete', 'Signed in successfully')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('auth.returnToApp', 'You can close this tab and return to the Sessio app.')}</p>
        </div>
      </div>
    );
  }

  // Retries exhausted but session is still valid → DB couldn't deliver the
  // profile in time. Show an inline error with a manual retry instead of
  // silently dumping the user back at sign-in.
  if (!loading && session && !profile && profileAttempts >= MAX_PROFILE_ATTEMPTS) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center px-6 max-w-sm">
          <div className="mb-6"><SessioLogoCompact /></div>
          <p className="font-medium text-foreground">
            {t('auth.profileLoadFailed', "We couldn't finish signing you in.")}
          </p>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {t('auth.profileLoadFailedDetail', 'Check your connection and try again.')}
          </p>
          <button
            type="button"
            onClick={() => setProfileAttempts(0)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 min-h-[44px]"
          >
            {t('auth.tryAgain', 'Try again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4"><SessioLoader /></div>
        <p className="text-muted-foreground">{t('auth.signingIn')}</p>
      </div>
    </div>
  );
}
