import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SessioLogoCompact, SessioLoader } from '@/components/SessioLogo';
import LanguageSelector from '@/components/shared/LanguageSelector';
import PageHeader from '@/components/shared/PageHeader';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Shared chrome for every auth screen: background image, logo, language
 * selector, footer with privacy/terms links. Pages only render the inner form.
 * Extracted from the old Auth.tsx so SignIn/SignUp/ForgotPassword/ResetPassword
 * all share the same look without duplication.
 */
export default function AuthLayout({ title, subtitle, children }: Props) {
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    // Safety net: on iPad WKWebView, image requests can stall with neither
    // onload nor onerror firing, leaving the whole auth screen stuck on
    // SessioLoader indefinitely. Force bgLoaded after 2s so the sign-in form
    // always renders even if the image load never completes.
    const fallback = setTimeout(() => setBgLoaded(true), 2000);
    const img = new Image();
    img.src = '/auth-bg.jpg';
    img.onload = () => { clearTimeout(fallback); setBgLoaded(true); };
    img.onerror = () => { clearTimeout(fallback); setBgLoaded(true); };
    return () => clearTimeout(fallback);
  }, []);

  if (!bgLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <SessioLoader />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      <div
        className="absolute inset-0 bg-cover bg-bottom"
        style={{ backgroundImage: 'url(/auth-bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <PageHeader inline className="rounded-b-2xl px-4 py-4">
          <div className="max-w-md mx-auto flex items-center justify-between text-white">
            <SessioLogoCompact />
            <LanguageSelector compact />
          </div>
        </PageHeader>

        <div className="flex-1 px-4 pt-12">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-white/70">{subtitle}</p>}
            </div>

            {children}
          </div>
        </div>

        <div className="relative z-10 pt-4 flex justify-center gap-4 text-xs text-white/40" style={{ paddingBottom: 'max(24px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 24px)))' }}>
          <Link to="/privacy" className="underline underline-offset-2 hover:text-white/70">Privacy</Link>
          <Link to="/terms" className="underline underline-offset-2 hover:text-white/70">Terms</Link>
        </div>
      </div>
    </div>
  );
}
