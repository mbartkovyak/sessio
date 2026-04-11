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
  const [retriedProfile, setRetriedProfile] = useState(false);

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

    // Session exists but profile didn't load. This can happen if the first
    // fetchProfile call raced ahead of the new session's JWT being fully
    // propagated through the Supabase client (observed on re-sign-in). Try
    // refreshProfile once more before giving up. Without this, the user
    // would be bounced to /auth/sign-in even though they're authenticated.
    // IMPORTANT: set `retriedProfile` only AFTER refreshProfile resolves,
    // otherwise the state update triggers a re-render before the refetch
    // completes and we'd navigate away before the retry has a chance.
    if (!profile) {
      if (!retriedProfile) {
        refreshProfile().finally(() => setRetriedProfile(true));
        return;
      }
      navigate('/auth/sign-in');
      return;
    }

    if (!profile.onboarding_complete || !profile.role) {
      navigate('/onboarding');
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
  }, [loading, session, profile, retriedProfile, refreshProfile, navigate]);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4"><SessioLoader /></div>
        <p className="text-muted-foreground">{t('auth.signingIn')}</p>
      </div>
    </div>
  );
}
