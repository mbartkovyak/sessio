import { useEffect, useState } from 'react';
import { Sparkles, Tag } from 'lucide-react';

type Step = 'idle' | 'card' | 'press' | 'filled';

const SLOTS = [
  { day: 'Mon', time: '18:00', label: 'Group A · full' },
  { day: 'Tue', time: '17:00', label: 'Kids · full' },
  { day: 'Wed', time: '19:00', label: 'Adults · full' },
];

export default function CoachFillHoursScene() {
  const [step, setStep] = useState<Step>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setStep('card'), 800);
    const t2 = setTimeout(() => setStep('press'), 2400);
    const t3 = setTimeout(() => setStep('filled'), 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="relative h-full w-full px-6 py-8 md:px-10 md:py-10">
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#111]/40">
        This week · Fill rate 87%
      </p>

      <div className="space-y-2">
        {SLOTS.map((s) => (
          <div key={s.day} className="flex items-center gap-3 rounded-xl border border-[#111]/8 bg-white px-3.5 py-2.5">
            <span className="w-10 text-xs font-semibold text-[#111]/50">{s.day}</span>
            <span className="w-12 text-xs font-medium text-[#111]/70">{s.time}</span>
            <span className="truncate text-xs text-[#111]/60">{s.label}</span>
          </div>
        ))}

        {/* Thursday row — the star. Empty → Happy Hour */}
        <div
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-500 ${
            step === 'filled'
              ? 'border border-accent/30 bg-accent/[0.06]'
              : 'border border-dashed border-[#111]/15 bg-[#111]/[0.015]'
          }`}
        >
          <span className="w-10 text-xs font-semibold text-[#111]/50">Thu</span>
          <span className="w-12 text-xs font-medium text-[#111]/70">14:00</span>
          {step === 'filled' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              <Tag className="h-2.5 w-2.5" />
              Happy hour · −20%
            </span>
          ) : (
            <span className="text-xs italic text-[#111]/35">Empty · 3 weeks</span>
          )}
        </div>
      </div>

      {/* AI prompt */}
      <div
        className={`mt-4 rounded-xl border bg-white p-3.5 transition-all duration-500 ease-out ${
          step === 'idle'
            ? 'opacity-0 -translate-y-2 border-[#111]/8'
            : 'opacity-100 translate-y-0 border-accent/30 shadow-[0_10px_30px_-10px_rgba(230,120,30,0.3)]'
        } ${step === 'filled' ? 'opacity-0 -translate-y-1' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] italic leading-snug text-[#111]/80">
              "Thursday 14:00 empty 3 weeks. Post as happy hour at −20%?"
            </p>
            <button
              type="button"
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-white transition-transform duration-200 ${
                step === 'press' ? 'scale-95' : 'scale-100'
              }`}
            >
              Post it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
