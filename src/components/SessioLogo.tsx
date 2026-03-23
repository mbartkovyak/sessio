export function SessioMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="hsl(193, 30%, 15%)" />
      {/* Bold S — two arcs */}
      <path
        d="M19 9c-2-1.5-6.5-0.5-6.5 3.5 0 3.5 7 3 7 7 0 3-4 4.5-7 3"
        stroke="hsl(193, 30%, 55%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Small ball trailing the S curve — sport hint */}
      <circle cx="21" cy="8.5" r="2" fill="hsl(38, 94%, 52%)" />
    </svg>
  );
}

export function SessioLogo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <SessioMark size={size} />
      <span className="text-xl font-semibold text-current" style={{ letterSpacing: '-0.04em' }}>
        sessio
      </span>
    </div>
  );
}

export function SessioLogoCompact({ size = 26 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <SessioMark size={size} />
      <span className="text-lg font-semibold text-current" style={{ letterSpacing: '-0.04em' }}>
        sessio
      </span>
    </div>
  );
}
