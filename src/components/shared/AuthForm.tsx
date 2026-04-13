import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import {
  signInWithGoogle,
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
} from '@/lib/auth-providers';
import { localizeErrorMessage } from '@/lib/localizedErrors';

type Mode = 'signin' | 'signup';

type Props = {
  mode: Mode;
};

/**
 * Shared authentication form. Used by SignIn and SignUp pages.
 *
 * Exposes Google, Apple, and email+password. Password is required in both
 * modes; magic-link OTP is now only used for password reset, not primary
 * sign-in. The invite-link pages (JoinTraining, JoinSchool) keep their own
 * inline auth UI because their surrounding chrome is light-themed.
 */
export default function AuthForm({ mode }: Props) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkEmailFor, setCheckEmailFor] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    const { error: err, inPlaceSession } = await signInWithGoogle();
    if (err) {
      // Android Credential Manager cancellation — user dismissed the picker.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancel/i.test(msg)) {
        setError(localizeErrorMessage(err, t('auth.googleFailed')));
      }
      setGoogleLoading(false);
      return;
    }
    if (inPlaceSession) {
      // Android native: session is already live → route through the callback.
      navigate('/auth/callback');
    }
    // Web / iOS: the browser is redirecting away — keep the spinner.
  }

  async function handleApple() {
    setError('');
    setAppleLoading(true);
    const { error: err, inPlaceSession } = await signInWithApple();
    if (err) {
      // iOS native sheet cancels surface as ASAuthorizationError code 1001.
      // Silently dismiss — not a real error.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancel|1001/i.test(msg)) {
        setError(localizeErrorMessage(err, t('auth.appleFailed')));
      }
      setAppleLoading(false);
      return;
    }
    if (inPlaceSession) {
      // Native iOS: session is already live → route through the callback.
      navigate('/auth/callback');
    }
    // Web: the browser is redirecting away to Apple's auth page. Leave the
    // spinner on until navigation completes.
  }

  function validatePassword(): string | null {
    if (password.length < 8) return t('auth.passwordTooShort');
    if (mode === 'signup' && password !== confirmPassword) return t('auth.passwordMismatch');
    return null;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const validation = validatePassword();
    if (validation) {
      setError(validation);
      return;
    }
    setEmailLoading(true);

    if (mode === 'signup') {
      const { error: err, needsConfirmation } = await signUpWithEmail(email, password);
      setEmailLoading(false);
      if (err) {
        setError(localizeErrorMessage(err, t('auth.signUpFailed')));
        return;
      }
      if (needsConfirmation) {
        setCheckEmailFor(email);
        return;
      }
      navigate('/auth/callback');
      return;
    }

    const { error: err } = await signInWithEmail(email, password);
    setEmailLoading(false);
    if (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isBadCreds = /invalid login|invalid credentials|email not confirmed/i.test(msg);
      setError(isBadCreds ? t('auth.invalidCredentials') : localizeErrorMessage(err, t('auth.signInFailed')));
      return;
    }
    navigate('/auth/callback');
  }

  if (checkEmailFor) {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm p-6 text-center">
        <div className="mb-3 text-4xl">📬</div>
        <h3 className="text-lg font-bold text-white">{t('auth.checkEmail')}</h3>
        <p className="mt-2 text-sm text-white/70">
          <Trans
            i18nKey="auth.checkEmailConfirm"
            ns="auth"
            values={{ email: checkEmailFor }}
            components={{ strong: <strong /> }}
          />
        </p>
        <Link
          to="/auth/sign-in"
          className="mt-4 inline-block text-sm text-white underline underline-offset-2"
        >
          {t('auth.signInLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Apple — listed first on iOS per Apple HIG "equivalent prominence" rule */}
      <button
        type="button"
        onClick={handleApple}
        disabled={appleLoading || googleLoading || emailLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-60 min-h-[44px]"
      >
        {appleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        )}
        {t('auth.continueApple')}
      </button>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={appleLoading || googleLoading || emailLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-black/30 backdrop-blur-sm px-4 py-3.5 font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-60 min-h-[44px]"
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        {t('auth.continueGoogle')}
      </button>

      <p className="text-center text-[11px] leading-tight text-white/40 px-2">
        <Trans
          i18nKey="auth.socialTerms"
          ns="auth"
          components={{
            terms: <Link to="/terms" className="underline underline-offset-2" />,
            privacy: <Link to="/privacy" className="underline underline-offset-2" />,
          }}
        />
      </p>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/20" />
        <span className="text-xs text-white/50">{t('auth.or')}</span>
        <div className="h-px flex-1 bg-white/20" />
      </div>

      {/* Email + password */}
      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-white pl-9 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl bg-white pl-9 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
          />
        </div>
        {mode === 'signup' && (
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
        )}
        {mode === 'signup' && (
          <label className="flex items-start gap-2.5 cursor-pointer px-1">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary rounded shrink-0"
            />
            <span className="text-xs leading-tight text-white/70">
              <Trans
                i18nKey="auth.termsCheckbox"
                ns="auth"
                components={{
                  terms: <Link to="/terms" className="underline underline-offset-2 text-white/90" />,
                  privacy: <Link to="/privacy" className="underline underline-offset-2 text-white/90" />,
                }}
              />
            </span>
          </label>
        )}
        {mode === 'signin' && (
          <div className="flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-xs text-white/70 hover:text-white underline underline-offset-2"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={emailLoading || appleLoading || googleLoading || !email || !password || (mode === 'signup' && !termsAccepted)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 min-h-[44px]"
        >
          {emailLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Toggle between sign in / sign up */}
      <div className="pt-2 text-center text-sm text-white/60">
        {mode === 'signin' ? (
          <>
            {t('auth.noAccount')}{' '}
            <Link to="/auth/sign-up" className="font-medium text-white underline underline-offset-2">
              {t('auth.signUpLink')}
            </Link>
          </>
        ) : (
          <>
            {t('auth.haveAccount')}{' '}
            <Link to="/auth/sign-in" className="font-medium text-white underline underline-offset-2">
              {t('auth.signInLink')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
