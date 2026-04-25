import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCursorParallax } from '@/hooks/shared/useCursorParallax';
import { useScrollProgress } from '@/hooks/shared/useScrollProgress';
import AudienceSelector from './AudienceSelector';
import AnimatedDemo from './AnimatedDemo';
import type { Audience } from './useLandingAudience';

const anim = (delay: number) => ({ animation: `fadeUp 0.6s ${delay}s ease-out both` });

export default function Hero({
  audience,
  onAudienceChange,
  onOpenAppModal,
}: {
  audience: Audience;
  onAudienceChange: (a: Audience) => void;
  onOpenAppModal: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { profile } = useAuth();
  const { ref: demoRef, style: demoStyle } = useCursorParallax<HTMLDivElement>({ maxTilt: 1.5 });
  const { ref: scrollRef, progress: scrollProgress } = useScrollProgress<HTMLElement>();

  const signedIn = !!profile;
  const primaryLabel = signedIn
    ? t('landing.nav.openApp')
    : t(`landing.hero.${audience}.ctaPrimary`);

  return (
    <section ref={scrollRef} className="relative z-10 px-5 pt-5 pb-16 md:px-10 md:pt-10 md:pb-24">
      {/* Scroll-linked orange halo behind the hero — drifts opposite the content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -z-10"
        style={{
          top: `${-80 + scrollProgress * 60}px`,
          height: '520px',
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(249,133,16,0.22) 0%, rgba(249,133,16,0.04) 45%, transparent 70%)',
          filter: 'blur(4px)',
          opacity: Math.max(0, 1 - scrollProgress * 1.4),
        }}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:gap-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
        {/* LEFT — copy + CTA */}
        <div className="text-center lg:text-left">
          {/* Audience selector */}
          <div className="mb-7 flex justify-center lg:justify-start" style={anim(0.02)}>
            <AudienceSelector audience={audience} onChange={onAudienceChange} />
          </div>

          {/* Eyebrow */}
          <p
            className="mb-5 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-accent md:text-xs"
            style={anim(0.08)}
          >
            {t(`landing.hero.${audience}.eyebrow`)}
          </p>

          {/* Headline */}
          <h1
            className="mb-6 max-w-2xl font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#111] md:text-[3.5rem] lg:text-[4rem] mx-auto lg:mx-0"
            style={anim(0.14)}
          >
            {t(`landing.hero.${audience}.title1`)}
            <br className="hidden sm:block" />{' '}
            <span className="text-[#111]/55">
              {t(`landing.hero.${audience}.title2`)}
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="mb-10 max-w-xl text-base leading-relaxed text-[#111]/60 md:text-lg mx-auto lg:mx-0"
            style={anim(0.24)}
          >
            {t(`landing.hero.${audience}.subtitle`)}
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" style={anim(0.34)}>
            <button
              onClick={() => (signedIn ? onOpenAppModal() : navigate('/auth/sign-up'))}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-[0_4px_20px_rgba(230,120,30,0.3)] transition-all hover:brightness-110 hover:shadow-[0_6px_32px_rgba(230,120,30,0.45)] active:scale-[0.98] min-h-[48px] min-w-[220px]"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* RIGHT — animated demo with cursor parallax */}
        <div
          id="demo-player"
          ref={demoRef}
          style={{ ...anim(0.48), ...demoStyle, willChange: 'transform' }}
          className="mx-auto w-full max-w-md lg:max-w-none"
        >
          <AnimatedDemo audience={audience} />
        </div>
      </div>
    </section>
  );
}
