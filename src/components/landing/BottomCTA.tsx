import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { Audience } from './useLandingAudience';

export default function BottomCTA({
  audience,
  onCtaClick,
}: {
  audience: Audience;
  onCtaClick: () => void;
}) {
  const { t } = useTranslation('auth');

  return (
    <section className="relative z-10 bg-[#141414] px-5 pb-10 pt-12 text-white md:px-10 md:pb-12 md:pt-16">
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mx-auto mb-5 max-w-xl font-display text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-[2.5rem]">
          {t(`landing.bottomCta.${audience}.title`)}
        </h2>
        <p className="mx-auto mb-10 max-w-md whitespace-pre-line text-base text-white/55 md:text-lg">
          {t(`landing.bottomCta.${audience}.sub`)}
        </p>
        <button
          onClick={onCtaClick}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-[0_4px_28px_rgba(249,133,16,0.45)] transition-all hover:brightness-110 hover:shadow-[0_6px_44px_rgba(249,133,16,0.6)] active:scale-[0.98] min-h-[48px]"
        >
          {t(`landing.bottomCta.${audience}.button`)}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
