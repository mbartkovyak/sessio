interface OnboardingProgressProps {
  current: number;
  total: number;
}

export default function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const safe = Math.max(1, Math.min(current, total));
  const pct = Math.max(0, Math.min(100, (safe / total) * 100));
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-2 bg-white/15 rounded-full overflow-hidden ring-1 ring-inset ring-white/10"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full bg-white transition-all duration-300 ease-out rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-white tabular-nums shrink-0 tracking-wide">
        {safe}/{total}
      </span>
    </div>
  );
}
