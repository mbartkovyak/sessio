import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SessioLogo } from '@/components/SessioLogo';
import LanguageSelector from '@/components/shared/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useLandingAudience } from '@/components/landing/useLandingAudience';
import Hero from '@/components/landing/Hero';
import ReplacesStrip from '@/components/landing/ReplacesStrip';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorks from '@/components/landing/HowItWorks';
import IntegrationsStrip from '@/components/landing/IntegrationsStrip';
import BottomCTA from '@/components/landing/BottomCTA';
import Footer from '@/components/landing/Footer';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { profile } = useAuth();
  const [audience, setAudience] = useLandingAudience();

  const signedIn = !!profile;
  const appHome = profile?.role === 'player' ? '/player' : '/coach';
  const navCtaLabel = signedIn ? t('landing.nav.openApp') : t('landing.nav.signIn');
  const navCtaHref = signedIn ? appHome : '/auth/sign-in';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0a08] text-white">
      {/* Top ambient glow — sits behind everything */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px]"
        style={{
          background:
            'radial-gradient(ellipse 75% 45% at 50% 0%, rgba(230,120,30,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Faint grid behind hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px] opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          mask: 'linear-gradient(to bottom, #000 20%, transparent 90%)',
          WebkitMask: 'linear-gradient(to bottom, #000 20%, transparent 90%)',
        }}
      />

      {/* Navbar */}
      <nav
        className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-10"
        style={{ animation: 'fadeDown 0.5s ease-out both' }}
      >
        <button
          onClick={() => navigate(signedIn ? appHome : '/')}
          aria-label="Sessio"
          className="text-white"
        >
          <SessioLogo />
        </button>
        <div className="flex items-center gap-3">
          <LanguageSelector compact />
          <button
            onClick={() => navigate(navCtaHref)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/[0.1] min-h-[40px]"
          >
            {navCtaLabel}
          </button>
        </div>
      </nav>

      <Hero audience={audience} onAudienceChange={setAudience} />
      <ReplacesStrip audience={audience} />
      <FeaturesSection audience={audience} />
      <HowItWorks audience={audience} />
      <IntegrationsStrip />
      <BottomCTA audience={audience} />
      <Footer />
    </div>
  );
}
