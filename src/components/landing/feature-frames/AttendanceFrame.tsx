import { Check } from 'lucide-react';

type Athlete = { initials: string; name: string; checked: boolean };

const ATHLETES: Athlete[] = [
  { initials: 'AK', name: 'Anna K.', checked: true },
  { initials: 'MW', name: 'Marcin W.', checked: true },
  { initials: 'TP', name: 'Tomasz P.', checked: true },
  { initials: 'JN', name: 'Julia N.', checked: true },
  { initials: 'KS', name: 'Kasia S.', checked: true },
  { initials: 'RB', name: 'Radek B.', checked: false },
];

// Mini attendance sheet: coach taps through a roster. One checkbox fills in on reveal.
export default function AttendanceFrame({ isVisible }: { isVisible: boolean }) {
  return (
    <div className="rounded-2xl border border-[#111]/8 bg-white p-5 md:p-6 shadow-[0_8px_24px_-12px_rgba(17,17,17,0.06)]">
      {/* Header */}
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#111]/45">Attendance</p>
        <p className="mt-1 font-display text-[15px] font-semibold text-[#111]">
          Tue 18:00 · Group A
        </p>
      </div>

      {/* Athlete rows */}
      <div className="space-y-1.5">
        {ATHLETES.map((athlete, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-[#111]/6 bg-[#FDFBF7] px-3 py-2 transition-all duration-500"
            style={{
              transitionDelay: `${200 + i * 50}ms`,
              transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
              opacity: isVisible ? 1 : 0,
              transitionTimingFunction: 'var(--ease-out-smooth, ease-out)',
            }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111]/[0.06] font-mono text-[10px] font-semibold text-[#111]/75">
              {athlete.initials}
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#111]/85">{athlete.name}</span>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-500 ${
                athlete.checked
                  ? 'border-accent bg-accent text-white'
                  : 'border-[#111]/15 bg-white'
              }`}
              style={{
                transitionDelay: `${400 + i * 50}ms`,
                transitionTimingFunction: 'var(--ease-out-smooth, ease-out)',
              }}
            >
              {athlete.checked && <Check className="h-3 w-3" strokeWidth={3} />}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-4 text-[12px] text-[#111]/50">5 of 6 checked in. One tap, one second.</p>
    </div>
  );
}
