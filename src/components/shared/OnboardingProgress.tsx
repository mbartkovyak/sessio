interface OnboardingProgressProps {
  current: number;
  total: number;
}

export default function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
