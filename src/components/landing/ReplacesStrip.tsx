import { useTranslation } from 'react-i18next';
import { MessageCircle, Bell, ImageOff, Calendar, MapPin, Apple, CreditCard } from 'lucide-react';
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
  { icon: Calendar, label: 'Google Calendar' },
  { icon: MapPin, label: 'Google Maps' },
  { icon: Apple, label: 'Apple Calendar' },
  { icon: CreditCard, label: 'Stripe', soon: true },
] as const;

export default function ReplacesStrip({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');

  return (
    <section className="relative z-10 border-y border-[#111]/8 px-5 py-14 md:px-10">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Row 1 — Replaces */}
        <div>
          <p className="mb-8 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40">
            {t(`landing.replaces.${audience}.label`)}
          </p>

          {audience === 'coach' ? (
            <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-7 md:gap-x-20">
              {COACH_BRANDS.map(({ label, src }) => (
                <div key={label} className="flex flex-col items-center gap-2.5">
                  <img
                    src={src}
                    alt={label}
                    className="h-11 w-11 md:h-12 md:w-12 transition-transform duration-300 hover:scale-105"
                  />
                  <span className="text-xs font-medium text-[#111]/60">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
              {ATHLETE_ITEMS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-[#111]/45 transition-colors hover:text-[#111]/80">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-sm font-medium tracking-tight">{label}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-sm text-[#111]/45 max-w-xl mx-auto">
            {t(`landing.replaces.${audience}.sub`)}
          </p>
        </div>

        {/* Divider */}
        <div className="mx-auto h-px w-16 bg-[#111]/8" aria-hidden="true" />

        {/* Row 2 — Integrates with */}
        <div>
          <p className="mb-8 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40">
            {t('landing.replaces.integratesLabel')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
            {INTEGRATIONS.map(({ icon: Icon, label, soon }) => (
              <div key={label} className="flex items-center gap-2.5 text-[#111]/45 transition-colors hover:text-[#111]/80">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-sm font-medium tracking-tight">{label}</span>
                {soon && (
                  <span className="rounded-full border border-[#111]/12 bg-[#111]/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#111]/50">
                    {t('landing.replaces.soon')}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[#111]/45 max-w-xl mx-auto">
            {t('landing.replaces.integratesSub')}
          </p>
        </div>
      </div>
    </section>
  );
}
