import { useTranslation } from 'react-i18next';
import {
  UserMinus, CreditCard, CalendarClock,
  FileText, MessageSquareReply,
  Hand, Bell, Search, Layers,
} from 'lucide-react';
import type { Audience } from './useLandingAudience';

// Keep this list tight — only the highest-ROI coach features render on the landing.
// Card order: Re-engage (card1), Save passes (card2), Fill empty hours (card3), Draft a reply (card6 in i18n).
// i18n keys card4, card5, card7, card8 are kept in the locale files for future use but not rendered here.
const COACH_CARD_KEYS = ['card1', 'card2', 'card3', 'card6'] as const;
const COACH_ICONS = [UserMinus, CreditCard, CalendarClock, MessageSquareReply];
const ATHLETE_ICONS = [Hand, Bell, Search, Layers];

export default function FeaturesSection({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');

  const keys = audience === 'coach'
    ? COACH_CARD_KEYS
    : (['card1', 'card2', 'card3', 'card4'] as const);
  const icons = audience === 'coach' ? COACH_ICONS : ATHLETE_ICONS;

  return (
    <section className="relative z-10 px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-accent">
            {t(`landing.features.${audience}.eyebrow`)}
          </p>
          <h2 className="mx-auto mb-4 max-w-2xl text-3xl font-bold leading-tight tracking-[-0.02em] text-[#111] md:text-[2.5rem]">
            {t(`landing.features.${audience}.title`)}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#111]/55 md:text-lg">
            {t(`landing.features.${audience}.subtitle`)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {keys.map((key, i) => {
            const Icon = icons[i] ?? FileText;
            return (
              <FeatureCard
                key={key}
                Icon={Icon}
                title={t(`landing.features.${audience}.${key}.title`)}
                prompt={t(`landing.features.${audience}.${key}.prompt`)}
                outcome={t(`landing.features.${audience}.${key}.outcome`)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  Icon, title, prompt, outcome,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  prompt: string;
  outcome: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-[#111]/8 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#111]/15 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.15)]">
      {/* Accent glow on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(230,120,30,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
          <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
        </div>

        <h3 className="mb-3 text-[15px] font-semibold tracking-tight text-[#111]">{title}</h3>

        <p className="mb-3 border-l-2 border-accent/50 pl-3 text-sm italic leading-relaxed text-[#111]/80">
          <span className="ai-shimmer">"</span>
          {prompt.replace(/^"/, '').replace(/"$/, '')}
          <span className="ai-shimmer">"</span>
        </p>

        <p className="text-sm leading-relaxed text-[#111]/50">{outcome}</p>
      </div>
    </div>
  );
}
