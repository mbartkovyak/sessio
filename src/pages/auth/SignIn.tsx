import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { SessioLoader } from '@/components/SessioLogo';
import AuthLayout from './AuthLayout';
import AuthForm from '@/components/shared/AuthForm';

export default function SignIn() {
  const { t } = useTranslation('auth');
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <SessioLoader />
      </div>
    );
  }
  if (profile) {
    const target = !profile.onboarding_complete
      ? '/onboarding'
      : profile.role === 'player' ? '/player' : '/coach';
    return <Navigate to={target} replace />;
  }

  return (
    <AuthLayout title={t('auth.signInTitle')} subtitle={t('auth.signInSubtitle')}>
      <AuthForm mode="signin" />
    </AuthLayout>
  );
}
