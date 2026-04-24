import { useTranslation } from 'react-i18next';
import { MessageCircle, FileSpreadsheet, StickyNote, Bell, ImageOff } from 'lucide-react';
import type { Audience } from './useLandingAudience';

const COACH_ITEMS = [
  { icon: MessageCircle, label: 'WhatsApp' },
  { icon: FileSpreadsheet, label: 'Excel' },
  { icon: FileSpreadsheet, label: 'Google Sheets' },
  { icon: StickyNote, label: 'Sticky notes' },
] as const;

const ATHLETE_ITEMS = [
  { icon: MessageCircle, label: 'Group chats' },
  { icon: Bell, label: 'Missed reminders' },
  { icon: ImageOff, label: 'Calendar screenshots' },
] as const;

export default function ReplacesStrip({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');
  const items = audience === 'coach' ? COACH_ITEMS : ATHLETE_ITEMS;

  return (
    <section className="relative z-10 border-y border-[#111]/8 px-5 py-12 md:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="mb-8 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40">
          {t(`landing.replaces.${audience}.label`)}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-[#111]/45 transition-colors hover:text-[#111]/80">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-sm font-medium tracking-tight">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[#111]/45 max-w-xl mx-auto">
          {t(`landing.replaces.${audience}.sub`)}
        </p>
      </div>
    </section>
  );
}
