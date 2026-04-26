import { useTranslation } from 'react-i18next';
import { useInView } from '@/hooks/shared/useInView';
import type { Audience } from './useLandingAudience';

const REPLACES = [
  { label: 'WhatsApp', src: '/logos/whatsapp.svg' },
  { label: 'Excel', src: '/logos/excel.svg' },
  { label: 'Google Sheets', src: '/logos/google-sheets.svg' },
] as const;

const INTEGRATIONS = [
  { label: 'Google Calendar', src: '/logos/google-calendar.svg' },
  { label: 'Google Maps', src: '/logos/google-maps.svg' },
  { label: 'Stripe', src: '/logos/stripe.svg', soon: true },
] as const;

const stagger = (i: number) => ({ animationDelay: `${i * 80}ms` });

export default function ReplacesStrip({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');
  const { ref, isVisible } = useInView<HTMLElement>(0.2);

  const items = [...REPLACES, ...INTEGRATIONS];

  return (
    <section
      ref={ref}
      className={`relative z-10 border-y border-[#111]/8 px-5 py-16 md:px-10 md:py-20 ${isVisible ? 'is-visible' : ''}`}
    >
      <div className="mx-auto max-w-6xl space-y-12">
        <div>
          <div className="grid grid-cols-2 items-end gap-2 sm:gap-3 md:gap-5">
            <div className="flex flex-col items-center" style={stagger(0)}>
              <p className="reveal-item mb-2 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40">
                {t(`landing.replaces.${audience}.label`)}
              </p>
              <BranchTree treeId="r" />
            </div>
            <div className="flex flex-col items-center" style={stagger(1)}>
              <p className="reveal-item mb-2 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#111]/40">
                {t('landing.replaces.integratesLabel')}
              </p>
              <BranchTree treeId="i" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-6 items-start gap-2 sm:gap-3 md:gap-5">
            {items.map(({ label, src, soon }, i) => (
              <div
                key={label}
                className="reveal-item flex min-w-0 flex-col items-center gap-2.5"
                style={stagger(2 + i)}
              >
                <div className="flex h-10 items-center justify-center sm:h-12 md:h-14">
                  <img
                    src={src}
                    alt={label}
                    className="h-8 w-auto transition-transform duration-300 hover:scale-110 sm:h-10 md:h-12"
                  />
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-center text-[11px] font-medium leading-tight text-[#111]/70 sm:text-xs md:text-sm">
                    {label}
                  </span>
                  {soon && (
                    <span className="rounded-full border border-[#111]/12 bg-[#111]/[0.03] px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#111]/50 sm:text-[10px]">
                      {t('landing.replaces.soon')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p
          className="reveal-item mx-auto max-w-2xl text-center text-base leading-relaxed text-[#111]/55 md:text-lg"
          style={stagger(9)}
        >
          {t(`landing.replaces.${audience}.sub`)}
        </p>
      </div>
    </section>
  );
}

function BranchTree({ treeId, beginOffset = 0 }: { treeId: string; beginOffset?: number }) {
  const branches = [
    { id: 'l', x: '16.67%', d: 'M 150 0 C 150 36 50 28 50 60', curved: true },
    { id: 'm', x: '50%', d: 'M 150 0 L 150 60', curved: false },
    { id: 'r', x: '83.33%', d: 'M 150 0 C 150 36 250 28 250 60', curved: true },
  ];
  const dur = '1.8s';
  const begin = `${beginOffset}s`;

  const dotAnims = (x: string, curved: boolean) => (
    <>
      {curved ? (
        <animate
          attributeName="cx"
          values={`50%;${x}`}
          dur={dur}
          begin={begin}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.45 0 0.55 1"
        />
      ) : (
        <animate
          attributeName="cx"
          values={`50%;${x}`}
          dur={dur}
          begin={begin}
          repeatCount="indefinite"
        />
      )}
      <animate attributeName="cy" values="0;100%" dur={dur} begin={begin} repeatCount="indefinite" />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.18;0.82;1"
        dur={dur}
        begin={begin}
        repeatCount="indefinite"
      />
    </>
  );

  return (
    <div className="relative block h-9 w-full sm:h-11 md:h-12">
      {/* Curved branch lines (viewBox stretches to fit container) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 300 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {branches.map(({ id, d }) => (
          <path
            key={id}
            d={d}
            stroke="hsl(var(--accent))"
            strokeOpacity="0.28"
            strokeWidth="1"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {/* Dots layered on top — no viewBox so circles stay round */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={`branch-glow-${treeId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
            <stop offset="40%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </radialGradient>
        </defs>
        {branches.map(({ id, x, curved }) => (
          <g key={`dot-${id}`}>
            <circle cx="50%" cy="0" r="9" fill={`url(#branch-glow-${treeId})`}>
              {dotAnims(x, curved)}
            </circle>
            <circle cx="50%" cy="0" r="2.8" fill="hsl(var(--accent))">
              {dotAnims(x, curved)}
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}
