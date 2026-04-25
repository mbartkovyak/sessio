import { useTranslation } from 'react-i18next';
import { MessageCircle, Bell, ImageOff, ChevronDown } from 'lucide-react';
import type { Audience } from './useLandingAudience';

const COACH_BRANDS = [
  { label: 'WhatsApp', src: '/logos/whatsapp.svg' },
  { label: 'Excel', src: '/logos/excel.svg' },
  { label: 'Google Sheets', src: '/logos/google-sheets.svg' },
] as const;

const ATHLETE_ITEMS = [
  { icon: MessageCircle, label: 'Group chats' },
  { icon: Bell, label: 'Missed reminders' },
  { icon: ImageOff, label: 'Calendar screenshots' },
] as const;

const INTEGRATIONS = [
  { label: 'Google Calendar', src: '/logos/google-calendar.svg' },
  { label: 'Google Maps', src: '/logos/google-maps.svg' },
  { label: 'Stripe', src: '/logos/stripe.svg', soon: true },
] as const;

const stagger = (i: number) => ({ animationDelay: `${i * 80}ms` });

export default function ReplacesStrip({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');

  const coachItems = [...COACH_BRANDS, ...INTEGRATIONS];

  return (
    <section className="relative z-10 border-y border-[#111]/8 px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-6xl space-y-12">
        {audience === 'coach' ? (
          <>
            <div>
              <p
                className="reveal-item mb-10 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40"
                style={stagger(0)}
              >
                {t('landing.replaces.coach.label')} <span className="text-[#111]/25">/</span>{' '}
                {t('landing.replaces.integratesLabel')}
              </p>

              <div className="grid grid-cols-6 items-start gap-2 sm:gap-3 md:gap-5">
                {coachItems.map(({ label, src, soon }, i) => (
                  <div
                    key={label}
                    className="reveal-item flex min-w-0 flex-col items-center gap-2.5"
                    style={stagger(1 + i)}
                  >
                    <PulseArrow delayMs={i * 140} />
                    <div className="flex h-10 items-center justify-center sm:h-12 md:h-14">
                      <img
                        src={src}
                        alt={label}
                        className="h-8 w-auto transition-transform duration-300 hover:scale-110 sm:h-10 md:h-12"
                      />
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-center text-[11px] font-medium leading-tight text-[#111]/70 sm:text-xs md:text-sm">
                        {label}
                      </span>
                      {soon && (
                        <span className="rounded-full border border-[#111]/12 bg-[#111]/[0.03] px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#111]/50 sm:text-[10px]">
                          {t('landing.replaces.soon')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p
              className="reveal-item mx-auto max-w-2xl text-center text-base leading-relaxed text-[#111]/55 md:text-lg"
              style={stagger(9)}
            >
              {t('landing.replaces.coach.sub')}
            </p>
          </>
        ) : (
          <>
            <div>
              <p className="reveal-item mb-10 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40" style={stagger(0)}>
                {t('landing.replaces.athlete.label')}
              </p>

              <div className="flex items-start justify-between gap-4 sm:gap-8 md:gap-12">
                {ATHLETE_ITEMS.map(({ icon: Icon, label }, i) => (
                  <div key={label} className="reveal-item flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-[#111]/55 transition-colors hover:text-[#111]/85" style={stagger(1 + i)}>
                    <Icon className="h-7 w-7" strokeWidth={1.75} />
                    <span className="text-xs font-medium tracking-tight sm:text-sm md:text-base">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-item mx-auto h-px w-16 bg-[#111]/8" style={stagger(4)} aria-hidden="true" />

            <div>
              <p className="reveal-item mb-10 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40" style={stagger(5)}>
                {t('landing.replaces.integratesLabel')}
              </p>
              <div className="flex items-start justify-between gap-4 sm:gap-8 md:gap-12">
                {INTEGRATIONS.map(({ label, src, soon }, i) => (
                  <div key={label} className="reveal-item flex min-w-0 flex-1 flex-col items-center gap-3" style={stagger(6 + i)}>
                    <PulseArrow delayMs={i * 220} />
                    <div className="flex h-12 items-center justify-center sm:h-14 md:h-16">
                      <img
                        src={src}
                        alt={label}
                        className="h-12 w-auto transition-transform duration-300 hover:scale-110 sm:h-14 md:h-16"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-center text-xs font-medium text-[#111]/70 sm:text-sm">{label}</span>
                      {soon && (
                        <span className="rounded-full border border-[#111]/12 bg-[#111]/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#111]/50">
                          {t('landing.replaces.soon')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function PulseArrow({ delayMs }: { delayMs: number }) {
  return (
    <div
      className="flex flex-col items-center text-accent"
      style={{ animation: 'arrowPulse 2.4s ease-in-out infinite', animationDelay: `${delayMs}ms` }}
      aria-hidden="true"
    >
      <span className="block h-3 w-px bg-accent/70" />
      <ChevronDown className="-mt-[3px] h-3.5 w-3.5" strokeWidth={2.5} />
    </div>
  );
}
