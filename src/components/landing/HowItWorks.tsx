import { useTranslation } from 'react-i18next';
import type { Audience } from './useLandingAudience';

export default function HowItWorks({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');

  const steps = [
    { n: '1', title: t(`landing.howItWorks.${audience}.step1Title`), desc: t(`landing.howItWorks.${audience}.step1Desc`) },
    { n: '2', title: t(`landing.howItWorks.${audience}.step2Title`), desc: t(`landing.howItWorks.${audience}.step2Desc`) },
    { n: '3', title: t(`landing.howItWorks.${audience}.step3Title`), desc: t(`landing.howItWorks.${audience}.step3Desc`) },
  ];

  return (
    <section className="relative z-10 px-5 py-20 md:px-10">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-12 text-center text-3xl font-bold leading-tight tracking-[-0.02em] text-white md:text-[2.25rem]">
          {t(`landing.howItWorks.${audience}.title`)}
        </h2>

        <div className="space-y-5">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="flex gap-5 items-start rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-5 transition-colors hover:bg-white/[0.035]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent border border-accent/25">
                {n}
              </div>
              <div className="pt-0.5">
                <h3 className="mb-1.5 text-[15px] font-semibold tracking-tight text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
