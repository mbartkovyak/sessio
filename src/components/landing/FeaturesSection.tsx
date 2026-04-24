import { useTranslation } from 'react-i18next';
import {
  UserMinus, CreditCard, CalendarClock, UserPlus,
  FileText, MessageSquareReply, TrendingUp, Users,
  Hand, Bell, Search, Layers,
} from 'lucide-react';
import type { Audience } from './useLandingAudience';

const COACH_ICONS = [UserMinus, CreditCard, CalendarClock, UserPlus, FileText, MessageSquareReply, TrendingUp, Users];
const ATHLETE_ICONS = [Hand, Bell, Search, Layers];

export default function FeaturesSection({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');

  const count = audience === 'coach' ? 8 : 4;
  const icons = audience === 'coach' ? COACH_ICONS : ATHLETE_ICONS;

  return (
    <section className="relative z-10 px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-accent/90">
            {t(`landing.features.${audience}.eyebrow`)}
          </p>
          <h2 className="mx-auto mb-4 max-w-2xl text-3xl font-bold leading-tight tracking-[-0.02em] text-white md:text-[2.5rem]">
            {t(`landing.features.${audience}.title`)}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/50 md:text-lg">
            {t(`landing.features.${audience}.subtitle`)}
          </p>
        </div>

        <div className={`grid gap-4 ${audience === 'coach' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
          {Array.from({ length: count }).map((_, i) => {
            const Icon = icons[i] ?? FileText;
            const key = `card${i + 1}`;
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
    <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.18] hover:bg-white/[0.04] hover:-translate-y-0.5">
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

        <h3 className="mb-3 text-[15px] font-semibold tracking-tight text-white">{title}</h3>

        <p className="mb-3 border-l-2 border-accent/40 pl-3 text-sm italic leading-relaxed text-white/75">
          <span className="ai-shimmer">"</span>
          {prompt.replace(/^"/, '').replace(/"$/, '')}
          <span className="ai-shimmer">"</span>
        </p>

        <p className="text-sm leading-relaxed text-white/45">{outcome}</p>
      </div>
    </div>
  );
}
