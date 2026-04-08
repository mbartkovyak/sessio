import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword } from '@/lib/auth-providers';
import { localizeErrorMessage } from '@/lib/localizedErrors';

/**
 * Landing page for password recovery magic links.
 *
 * Flow:
 * 1. User requests reset via ForgotPassword → email with magic link.
 * 2. Link opens a browser at /auth/reset-password#access_token=...&type=recovery
 * 3. Supabase client (detectSessionInUrl) auto-establishes a recovery session,
 *    which the AuthContext listener picks up and exposes as `session`.
 * 4. We show password + confirm fields → call updateUser → navigate home.
 *
 * We don't need a custom onAuthStateChange listener because AuthContext is
 * already listening and exposes `session` to all descendants.
 */
export default function ResetPassword() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setSubmitting(true);
    const { error: err } = await updatePassword(password);
    setSubmitting(false);
    if (err) {
      setError(localizeErrorMessage(err, t('auth.resetPasswordFailed')));
      return;
    }
    // User is already signed in at this point (recovery session) — route through
    // AuthCallback which handles onboarding / role-based home routing.
    navigate('/auth/callback', { replace: true });
  }

  if (authLoading) {
    return (
      <AuthLayout title={t('auth.resetPasswordTitle')}>
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout title={t('auth.resetPasswordTitle')}>
        <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-6 text-center">
          <p className="text-sm text-white/80">{t('auth.resetPasswordExpired')}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.resetPasswordTitle')} subtitle={t('auth.resetPasswordSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.newPassword')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            minLength={8}
            className="w-full rounded-xl bg-white pl-9 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl bg-white pl-9 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !password || !confirmPassword}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 min-h-[44px]"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.resetPasswordAction')}
        </button>
      </form>
    </AuthLayout>
  );
}
