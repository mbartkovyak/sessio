import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Apple, CreditCard } from 'lucide-react';

const ITEMS = [
  { icon: Calendar, label: 'Google Calendar' },
  { icon: MapPin, label: 'Google Maps' },
  { icon: Apple, label: 'Apple Calendar' },
  { icon: CreditCard, label: 'Stripe', soon: true },
] as const;

export default function IntegrationsStrip() {
  const { t } = useTranslation('auth');

  return (
    <section className="relative z-10 border-y border-white/[0.06] px-5 py-12 md:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="mb-8 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-white/40">
          {t('landing.integrations.label')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
          {ITEMS.map(({ icon: Icon, label, soon }) => (
            <div key={label} className="flex items-center gap-2.5 text-white/45 transition-colors hover:text-white/75">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-sm font-medium tracking-tight">{label}</span>
              {soon && (
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
                  {t('landing.integrations.soon')}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-white/35 max-w-xl mx-auto">
          {t('landing.integrations.sub')}
        </p>
      </div>
    </section>
  );
}
