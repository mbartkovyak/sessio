import { useEffect, useState } from 'react';
import { Bell, MapPin } from 'lucide-react';

type Step = 'idle' | 'notification' | 'map' | 'done';

export default function AthleteReminderScene() {
  const [step, setStep] = useState<Step>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setStep('notification'), 500);
    const t2 = setTimeout(() => setStep('map'), 2000);
    const t3 = setTimeout(() => setStep('done'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center px-6 py-8 md:px-10">
      <div className="w-full max-w-sm space-y-3">
        {/* Push notification */}
        <div
          className={`flex items-start gap-3 rounded-2xl border border-[#111]/10 bg-white/80 p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-all duration-500 ease-out ${
            step === 'idle'
              ? 'opacity-0 -translate-y-6'
              : step === 'done'
                ? 'opacity-0 -translate-y-3'
                : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#111]">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#111]/50">Sessio</p>
              <p className="text-[10px] text-[#111]/40">now</p>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-[#111]">Training in 1 hour</p>
            <p className="mt-0.5 text-xs text-[#111]/55">Tennis · Kort 3 · Marszałkowska 12</p>
          </div>
        </div>

        {/* Map pin card */}
        <div
          className={`flex items-center gap-3 rounded-2xl border border-[#111]/8 bg-white p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.12)] transition-all duration-500 ease-out ${
            step === 'idle' || step === 'notification'
              ? 'opacity-0 translate-y-3'
              : step === 'done'
                ? 'opacity-0 translate-y-1'
                : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <MapPin className="h-4 w-4 text-accent" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#111]">Open directions</p>
            <p className="mt-0.5 text-xs text-[#111]/55">12 min drive · pinned on map</p>
          </div>
        </div>
      </div>
    </div>
  );
}
