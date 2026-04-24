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
        <h2 className="mb-12 text-center text-3xl font-bold leading-tight tracking-[-0.02em] text-[#111] md:text-[2.25rem]">
          {t(`landing.howItWorks.${audience}.title`)}
        </h2>

        <div className="space-y-4">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="flex gap-5 items-start rounded-2xl border border-[#111]/8 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#111]/15">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent border border-accent/25">
                {n}
              </div>
              <div className="pt-0.5">
                <h3 className="mb-1.5 text-[15px] font-semibold tracking-tight text-[#111]">{title}</h3>
                <p className="text-sm leading-relaxed text-[#111]/55">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
