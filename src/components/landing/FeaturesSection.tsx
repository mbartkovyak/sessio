import { useTranslation } from 'react-i18next';
import {
  UserMinus, CreditCard, CalendarClock,
  FileText, MessageSquareReply,
  Hand, Bell, Search, Layers,
} from 'lucide-react';
import { useInView } from '@/hooks/shared/useInView';
import ScheduleFrame from './feature-frames/ScheduleFrame';
import AttendanceFrame from './feature-frames/AttendanceFrame';
import ChatFrame from './feature-frames/ChatFrame';
import type { Audience } from './useLandingAudience';

// Athlete-variant keys (coach audience now uses product frames; see bento below).
const ATHLETE_ICONS = [Hand, Bell, Search, Layers];
const COACH_ICONS = [UserMinus, CreditCard, CalendarClock, MessageSquareReply];

export default function FeaturesSection({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');
  const { ref, isVisible } = useInView<HTMLDivElement>(0.15);

  return (
    <section className="relative z-10 px-5 py-20 md:px-10 md:py-28">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-accent">
            {t(`landing.features.${audience}.eyebrow`)}
          </p>
          <h2 className="mx-auto mb-4 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#111] md:text-[2.5rem]">
            {t(`landing.features.${audience}.title`)}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#111]/55 md:text-lg">
            {t(`landing.features.${audience}.subtitle`)}
          </p>
        </div>

        {audience === 'coach' ? (
          // Coach audience: bento grid of live-looking product frames.
          // Mobile stacks; desktop runs 2-col with the schedule frame spanning both cols on top.
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <div className="md:col-span-2">
              <ScheduleFrame isVisible={isVisible} />
            </div>
            <AttendanceFrame isVisible={isVisible} />
            <ChatFrame isVisible={isVisible} />
          </div>
        ) : (
          // Athlete audience keeps the copilot-prompt cards for now.
          <div className="grid gap-5 md:grid-cols-2">
            {(['card1', 'card2', 'card3', 'card4'] as const).map((key, i) => {
              const Icon = ATHLETE_ICONS[i] ?? FileText;
              return (
                <FeatureCard
                  key={key}
                  Icon={Icon}
                  title={t(`landing.features.athlete.${key}.title`)}
                  prompt={t(`landing.features.athlete.${key}.prompt`)}
                  outcome={t(`landing.features.athlete.${key}.outcome`)}
                />
              );
            })}
          </div>
        )}
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
    <div className="group relative rounded-2xl border border-[#111]/8 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#111]/15 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.15)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(230,120,30,0.08) 0%, transparent 70%)',
        }}
      />
      <div className="relative">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
          <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
        </div>
        <h3 className="mb-3 font-display text-[22px] font-semibold leading-snug tracking-[-0.02em] text-[#111] md:text-2xl">{title}</h3>
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
