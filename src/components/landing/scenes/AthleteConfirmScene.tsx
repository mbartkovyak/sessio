import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

type Step = 'idle' | 'question' | 'press' | 'confirmed';

export default function AthleteConfirmScene() {
  const [step, setStep] = useState<Step>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setStep('question'), 700);
    const t2 = setTimeout(() => setStep('press'), 2100);
    const t3 = setTimeout(() => setStep('confirmed'), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center px-6 py-8 md:px-10">
      <div className="w-full max-w-sm">
        {/* Training card */}
        <div className="rounded-2xl border border-[#111]/8 bg-white p-5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.12)]">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#111]/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#111]/60">
              Tuesday · 18:00
            </span>
          </div>
          <h4 className="mb-1 text-base font-bold text-[#111]">Tennis · Group A</h4>
          <p className="mb-4 text-xs text-[#111]/55">Kort 3 · Marszałkowska 12</p>

          {/* Question */}
          <div
            className={`transition-all duration-400 ease-out ${
              step === 'idle' ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            } ${step === 'confirmed' ? 'opacity-0 -translate-y-1' : ''}`}
          >
            <p className="mb-3 text-sm font-semibold text-[#111]">You're in. Still coming?</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-full bg-[#2aa876] px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-200 ${
                  step === 'press' ? 'scale-95 brightness-110' : 'scale-100'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border border-[#111]/12 bg-white px-4 py-2.5 text-sm font-semibold text-[#111]/55"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Confirmed state — overlays */}
          <div
            className={`absolute inset-x-5 bottom-5 transition-all duration-500 ease-out ${
              step === 'confirmed' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3 rounded-xl bg-[#2aa876]/10 border border-[#2aa876]/25 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2aa876]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111]">You're confirmed</p>
                <p className="text-xs text-[#111]/55">Your coach has been notified.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
