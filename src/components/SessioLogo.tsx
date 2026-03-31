export function SessioMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="hsl(0, 0%, 9%)" />
      {/* Bold S — two arcs */}
      <path
        d="M19 9c-2-1.5-6.5-0.5-6.5 3.5 0 3.5 7 3 7 7 0 3-4 4.5-7 3"
        stroke="hsl(0, 0%, 100%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Small ball trailing the S curve — sport hint */}
      <circle cx="21" cy="8.5" r="2" fill="hsl(30, 95%, 52%)" />
    </svg>
  );
}

export function SessioLogo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-0">
      <SessioMark size={size} />
      <span className="-ml-2 text-xl font-semibold text-current" style={{ letterSpacing: '-0.04em' }}>
        essio
      </span>
    </div>
  );
}

export function SessioLoader({ size = 80 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sessio-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="32" height="32" rx="8" fill="hsl(0, 0%, 9%)" />
      <path
        d="M19 9c-2-1.5-6.5-0.5-6.5 3.5 0 3.5 7 3 7 7 0 3-4 4.5-7 3"
        stroke="hsl(0, 0%, 100%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="0" cy="0" r="2" fill="hsl(30, 95%, 52%)" filter="url(#sessio-glow)">
        <animateMotion
          path="M19,9 c-2,-1.5,-6.5,-0.5,-6.5,3.5 c0,3.5,7,3,7,7 c0,3,-4,4.5,-7,3"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keyPoints="0;1;0"
          keyTimes="0;0.5;1"
          keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
        />
        <animate attributeName="r" values="2;2.3;2;1.8;2" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function SessioLogoCompact({ size = 26 }: { size?: number }) {
  return (
    <div className="flex items-center gap-0">
      <SessioMark size={size} />
      <span className="-ml-2 text-lg font-semibold text-current" style={{ letterSpacing: '-0.04em' }}>
        essio
      </span>
    </div>
  );
}
