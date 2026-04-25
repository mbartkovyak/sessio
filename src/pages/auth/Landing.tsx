import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SessioLogo } from '@/components/SessioLogo';
import LanguageSelector from '@/components/shared/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import { isNative } from '@/lib/platform';
import { useLandingAudience } from '@/components/landing/useLandingAudience';
import Hero from '@/components/landing/Hero';
import ReplacesStrip from '@/components/landing/ReplacesStrip';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorks from '@/components/landing/HowItWorks';
import BottomCTA from '@/components/landing/BottomCTA';
import Footer from '@/components/landing/Footer';
import GetTheApp from '@/components/landing/GetTheApp';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { profile } = useAuth();
  const [audience, setAudience] = useLandingAudience();
  const [appModalOpen, setAppModalOpen] = useState(false);

  // Landing is web-only. Installed iOS/Android app should never see it —
  // route straight to sign-in (SignIn handles the logged-in case and redirects home).
  if (isNative) {
    if (profile) {
      const home = profile.role === 'player' ? '/player' : '/coach';
      return <Navigate to={home} replace />;
    }
    return <Navigate to="/auth/sign-in" replace />;
  }

  const signedIn = !!profile;
  const appHome = profile?.role === 'player' ? '/player' : '/coach';
  const openAppModal = () => setAppModalOpen(true);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-[#111]"
      style={{ background: 'hsl(35 20% 92%)' }}
    >
      {/* Top ambient accent — warm orange halo behind hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(230,120,30,0.22) 0%, rgba(230,120,30,0.06) 40%, transparent 75%)',
        }}
      />

      {/* Faint grid behind hero — near-black lines on beige */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px] opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #111 1px, transparent 1px), linear-gradient(to bottom, #111 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          mask: 'linear-gradient(to bottom, #000 15%, transparent 90%)',
          WebkitMask: 'linear-gradient(to bottom, #000 15%, transparent 90%)',
        }}
      />

      {/* Navbar */}
      <header className="relative z-20 h-16 border-b border-[#111]/[0.035]">
        <nav
          className="mx-auto flex h-full max-w-6xl items-center justify-between px-5 md:px-10"
          style={{ animation: 'fadeDown 0.5s ease-out both' }}
        >
          <button
            onClick={() => navigate(signedIn ? appHome : '/')}
            aria-label="Sessio"
            className="text-[#111]"
          >
            <SessioLogo size={42} />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <LanguageSelector compact tone="light" compactBare />
            {signedIn ? (
              <button
                onClick={() => navigate(appHome)}
                className="rounded-full bg-[#111] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#222] active:scale-[0.98] min-h-[40px]"
              >
                {t('landing.nav.openApp')}
              </button>
            ) : (
              <button
                onClick={openAppModal}
                className="rounded-full bg-[#111] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#222] active:scale-[0.98] min-h-[40px] md:px-5"
              >
                {t('landing.nav.getTheApp')}
              </button>
            )}
          </div>
        </nav>
      </header>

      <Hero audience={audience} onAudienceChange={setAudience} onOpenAppModal={openAppModal} />
      <ReplacesStrip audience={audience} />
      <FeaturesSection audience={audience} />
      <HowItWorks audience={audience} />
      <BottomCTA audience={audience} onOpenAppModal={openAppModal} />
      <Footer />
      <GetTheApp open={appModalOpen} onClose={() => setAppModalOpen(false)} />
    </div>
  );
}
