import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import AudienceSelector from './AudienceSelector';
import DemoPlayer from './DemoPlayer';
import type { Audience } from './useLandingAudience';

const anim = (delay: number) => ({ animation: `fadeUp 0.6s ${delay}s ease-out both` });

export default function Hero({
  audience,
  onAudienceChange,
}: {
  audience: Audience;
  onAudienceChange: (a: Audience) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { profile } = useAuth();

  // CTA target: logged-in users go to their app home, logged-out users sign up
  const signedIn = !!profile;
  const appHome = profile?.role === 'player' ? '/player' : '/coach';

  const primaryHref = signedIn ? appHome : '/auth/sign-up';
  const primaryLabel = signedIn
    ? t('landing.nav.openApp')
    : t(`landing.hero.${audience}.ctaPrimary`);

  return (
    <section className="relative z-10 px-5 pt-10 pb-16 md:px-10 md:pt-16 md:pb-24">
      <div className="mx-auto max-w-5xl text-center">
        {/* Audience selector */}
        <div className="mb-8 flex justify-center" style={anim(0.02)}>
          <AudienceSelector audience={audience} onChange={onAudienceChange} />
        </div>

        {/* Eyebrow */}
        <p
          className="mb-5 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-accent/90 md:text-xs"
          style={anim(0.08)}
        >
          {t(`landing.hero.${audience}.eyebrow`)}
        </p>

        {/* Headline */}
        <h1
          className="mx-auto mb-6 max-w-3xl text-[2.5rem] font-bold leading-[1.05] tracking-[-0.025em] text-white md:text-[4rem]"
          style={anim(0.14)}
        >
          {t(`landing.hero.${audience}.title1`)}
          <br className="hidden sm:block" />{' '}
          <span className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
            {t(`landing.hero.${audience}.title2`)}
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/55 md:text-lg"
          style={anim(0.24)}
        >
          {t(`landing.hero.${audience}.subtitle`)}
        </p>

        {/* CTA row */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row" style={anim(0.34)}>
          <button
            onClick={() => navigate(primaryHref)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-[0_0_32px_rgba(230,120,30,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_48px_rgba(230,120,30,0.5)] active:scale-[0.98] min-h-[48px] min-w-[220px]"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              // Scroll to the demo player; click-through handled by DemoPlayer itself on hover
              document.getElementById('demo-player')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3.5 text-base font-medium text-white/90 transition-all hover:bg-white/[0.08] hover:border-white/25 min-h-[48px] min-w-[180px]"
          >
            <Play className="h-4 w-4 fill-white/90 text-white/90" />
            {t(`landing.hero.${audience}.ctaSecondary`)}
          </button>
        </div>
      </div>

      {/* Demo video */}
      <div id="demo-player" style={anim(0.48)}>
        <DemoPlayer audience={audience} />
      </div>
    </section>
  );
}
