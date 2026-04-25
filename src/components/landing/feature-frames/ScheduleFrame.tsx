import { Check, Clock } from 'lucide-react';

type Row = {
  day: string;
  time: string;
  title: string;
  filled: number;
  total: number;
  highlighted?: boolean;
};

const ROWS: Row[] = [
  { day: 'Mon', time: '16:00', title: 'Juniors U12', filled: 8, total: 8 },
  { day: 'Mon', time: '18:00', title: 'Dinosaurs', filled: 4, total: 4, highlighted: true },
  { day: 'Tue', time: '17:30', title: 'Teens A', filled: 6, total: 8 },
  { day: 'Wed', time: '18:00', title: 'Adult group', filled: 5, total: 6 },
];

// Mini schedule: visual of coach's week with one slot animating full on reveal.
export default function ScheduleFrame({ isVisible }: { isVisible: boolean }) {
  return (
    <div className="rounded-2xl border border-[#111]/8 bg-white p-5 md:p-6 shadow-[0_8px_24px_-12px_rgba(17,17,17,0.06)]">
      {/* Frame header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#111]/45">
            Week view
          </p>
          <p className="mt-1 font-display text-[15px] font-semibold text-[#111]">
            Week of Nov 3
          </p>
        </div>
        <div className="rounded-full border border-[#111]/10 bg-[#111]/[0.02] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-[#111]/55">
          Live
          <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden />
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {ROWS.map((row, i) => {
          const isFull = row.filled === row.total;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-[#111]/6 bg-[#FDFBF7] px-3 py-2.5 transition-all duration-500"
              style={{
                transitionDelay: `${200 + i * 60}ms`,
                transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
                opacity: isVisible ? 1 : 0,
                transitionTimingFunction: 'var(--ease-out-smooth, ease-out)',
              }}
            >
              <div className="flex w-14 items-baseline gap-1.5">
                <span className="font-mono text-[11px] font-medium uppercase text-[#111]/45">{row.day}</span>
                <span className="font-mono text-[12px] font-medium text-[#111]/75">{row.time}</span>
              </div>
              <span className="flex-1 text-[13px] font-medium text-[#111]/85">{row.title}</span>
              <div
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors duration-500 ${
                  isFull
                    ? 'bg-accent/10 text-accent'
                    : 'bg-[#111]/[0.04] text-[#111]/55'
                }`}
              >
                {isFull ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <Clock className="h-3 w-3" />}
                {row.filled}/{row.total}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="mt-4 text-[12px] text-[#111]/50">
        Auto-confirms 48h before. Gaps get filled from the waitlist.
      </p>
    </div>
  );
}
