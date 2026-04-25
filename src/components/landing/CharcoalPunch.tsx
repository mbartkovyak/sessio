import { useTranslation } from 'react-i18next';
import { useInView } from '@/hooks/shared/useInView';

// Dark rhythm-break section between the feature bento and the bottom CTA.
// Pull-quote plus two product-behaviour cards. Warm beige → graphite → beige.
export default function CharcoalPunch() {
  const { t } = useTranslation('auth');
  const { ref, isVisible } = useInView<HTMLElement>(0.2);

  return (
    <section
      ref={ref}
      className={`relative z-10 overflow-hidden bg-[#141414] px-5 py-20 text-white md:px-10 md:py-28 ${
        isVisible ? 'is-visible' : ''
      }`}
    >
      {/* Ambient orange halo in the top-right, breathing */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[500px] w-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(249,133,16,0.18) 0%, rgba(249,133,16,0) 60%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        {/* Pull quote */}
        <p
          className="reveal-item mx-auto max-w-3xl text-center font-display text-[2rem] font-semibold leading-[1.15] tracking-[-0.025em] md:text-[3rem]"
          style={{ animationDelay: '0ms' }}
        >
          {t('landing.charcoal.quote')}
        </p>

        {/* Two product-behaviour cards */}
        <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
          <BehaviourCard
            label={t('landing.charcoal.stat1Label')}
            title={t('landing.charcoal.stat1Title')}
            body={t('landing.charcoal.stat1Body')}
            delay={120}
          />
          <BehaviourCard
            label={t('landing.charcoal.stat2Label')}
            title={t('landing.charcoal.stat2Title')}
            body={t('landing.charcoal.stat2Body')}
            delay={200}
          />
        </div>
      </div>
    </section>
  );
}

function BehaviourCard({
  label, title, body, delay,
}: {
  label: string;
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <div
      className="reveal-item rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm md:p-8"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{label}</p>
      <h3 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-[1.75rem]">
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-white/60">{body}</p>
    </div>
  );
}
