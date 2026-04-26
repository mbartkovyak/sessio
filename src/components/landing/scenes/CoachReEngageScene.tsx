import { useEffect, useState } from 'react';
import { Sparkles, Send, Check } from 'lucide-react';

type Step = 'idle' | 'card' | 'press' | 'sent';

export default function CoachReEngageScene() {
  const [step, setStep] = useState<Step>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setStep('card'), 800);
    const t2 = setTimeout(() => setStep('press'), 2400);
    const t3 = setTimeout(() => setStep('sent'), 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="relative h-full w-full px-6 py-8 md:px-10 md:py-10">
      {/* Fake header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#111]/40">Monday · Morning</p>
          <h4 className="mt-1 text-lg font-bold text-[#111] md:text-xl">Coach dashboard</h4>
        </div>
        <div className="h-8 w-8 rounded-full bg-[#111]/10" />
      </div>

      {/* Calmer, 'normal day' card behind */}
      <div className="mb-3 rounded-xl border border-[#111]/8 bg-white px-4 py-3">
        <p className="text-xs font-medium text-[#111]/55">Today · 3 trainings</p>
        <p className="mt-0.5 text-sm font-semibold text-[#111]">18 athletes confirmed</p>
      </div>

      {/* AI prompt card (entry) */}
      <div
        className={`rounded-xl border bg-white p-4 transition-all duration-500 ease-out ${
          step === 'idle' ? 'opacity-0 -translate-y-2 border-[#111]/8' : 'opacity-100 translate-y-0 border-accent/30 shadow-[0_10px_30px_-10px_rgba(230,120,30,0.3)]'
        } ${step === 'sent' ? 'border-[#2aa876]/40' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
            step === 'sent' ? 'bg-[#2aa876]/15' : 'bg-accent/15'
          }`}>
            {step === 'sent'
              ? <Check className="h-4 w-4 text-[#2aa876]" strokeWidth={2.5} />
              : <Sparkles className="h-4 w-4 text-accent" strokeWidth={2.25} />}
          </div>
          <div className="min-w-0 flex-1">
            {step !== 'sent' ? (
              <>
                <p className="text-[13px] italic leading-snug text-[#111]/80">
                  "Anna hasn't booked in 3 weeks — send a nudge?"
                </p>
                <button
                  type="button"
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-white transition-transform duration-200 ${
                    step === 'press' ? 'scale-95' : 'scale-100'
                  }`}
                >
                  <Send className="h-3 w-3" />
                  Send
                </button>
              </>
            ) : (
              <p className="text-[13px] font-medium text-[#111]/80">
                Sent to Anna · "Hey! Want to book your next session?"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
