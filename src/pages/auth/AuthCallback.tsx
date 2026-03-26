import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { t } = useTranslation('auth');

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      navigate('/auth');
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
      sessionStorage.removeItem('pending_invite');
      sessionStorage.removeItem('pending_invite_ts');
      navigate(`/join/${pendingInvite}`);
      return;
    }

    navigate(profile.role === 'player' ? '/player' : '/coach');
  }, [loading, profile, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">{t('auth.signingIn')}</p>
      </div>
    </div>
  );
}
