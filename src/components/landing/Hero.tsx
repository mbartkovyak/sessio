import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
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

  const signedIn = !!profile;
  const primaryLabel = signedIn
    ? t('landing.nav.openApp')
    : t(`landing.hero.${audience}.ctaPrimary`);

  return (
    <section className="relative z-10 px-5 pt-5 pb-16 md:px-10 md:pt-10 md:pb-24">
      <div className="mx-auto max-w-5xl text-center">
        {/* Audience selector */}
        <div className="mb-8 flex justify-center" style={anim(0.02)}>
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
          className="mx-auto mb-6 max-w-3xl text-[2.5rem] font-bold leading-[1.05] tracking-[-0.025em] text-[#111] md:text-[4rem]"
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
          className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-[#111]/60 md:text-lg"
          style={anim(0.24)}
        >
          {t(`landing.hero.${audience}.subtitle`)}
        </p>

        {/* CTA row */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row" style={anim(0.34)}>
          <button
            onClick={() => (signedIn ? onOpenAppModal() : navigate('/auth/sign-up'))}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-[0_4px_20px_rgba(230,120,30,0.3)] transition-all hover:brightness-110 hover:shadow-[0_6px_32px_rgba(230,120,30,0.45)] active:scale-[0.98] min-h-[48px] min-w-[220px]"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              document.getElementById('demo-player')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#111]/12 bg-white/70 px-6 py-3.5 text-base font-medium text-[#111] transition-all hover:bg-white hover:border-[#111]/20 min-h-[48px] min-w-[180px]"
          >
            <Play className="h-4 w-4 fill-[#111] text-[#111]" />
            {t(`landing.hero.${audience}.ctaSecondary`)}
          </button>
        </div>
      </div>

      {/* Animated demo */}
      <div id="demo-player" style={anim(0.48)}>
        <AnimatedDemo audience={audience} />
      </div>
    </section>
  );
}
