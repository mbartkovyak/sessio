import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { requestPasswordReset } from '@/lib/auth-providers';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function ForgotPassword() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await requestPasswordReset(email);
    setLoading(false);
    if (err) {
      setError(localizeErrorMessage(err, t('auth.forgotPasswordFailed')));
      return;
    }
    setSent(true);
  }

  return (
    <AuthLayout title={t('auth.forgotPasswordTitle')} subtitle={sent ? undefined : t('auth.forgotPasswordSubtitle')}>
      {sent ? (
        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm p-6 text-center">
          <div className="mb-3 text-4xl">📬</div>
          <p className="text-sm text-white/80">
            <Trans
              i18nKey="auth.forgotPasswordSuccess"
              ns="auth"
              values={{ email }}
              components={{ strong: <strong /> }}
            />
          </p>
          <Link
            to="/auth/sign-in"
            className="mt-4 inline-flex items-center gap-1 text-sm text-white underline underline-offset-2"
          >
            <ArrowLeft className="h-4 w-4" /> {t('auth.signInLink')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl bg-white pl-9 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 min-h-[44px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.forgotPasswordAction')}
          </button>
          <div className="pt-2 text-center">
            <Link
              to="/auth/sign-in"
              className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> {t('auth.signInLink')}
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
