import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PhoneFrame from './PhoneFrame';
import type { Audience } from './useLandingAudience';

const SCENE_DURATION_MS = 4000;
// Apple-style ease-in-out curve. Cheap to apply, makes opacity/scale feel
// physical rather than computer-y.
const TRANSITION_EASE = 'cubic-bezier(0.65, 0.05, 0.35, 1)';
const TRANSITION_OPACITY_MS = 750;
const TRANSITION_SCALE_MS = 950;

type Scene = {
  id: string;
  img: string;
  eyebrowKey: string;
  captionKey: string;
};

// Coach loop. Five real-screen frames, 2s each, plain crossfade.
const COACH_SCENES: Scene[] = [
  { id: 'home',       img: '/landing/demo/coach-home.png',       eyebrowKey: '1', captionKey: '1' },
  { id: 'calendar',   img: '/landing/demo/coach-calendar.png',   eyebrowKey: '2', captionKey: '2' },
  { id: 'attendance', img: '/landing/demo/coach-attendance.png', eyebrowKey: '3', captionKey: '3' },
  { id: 'passes',     img: '/landing/demo/coach-passes.png',     eyebrowKey: '4', captionKey: '4' },
  { id: 'stats',      img: '/landing/demo/coach-stats.png',      eyebrowKey: '5', captionKey: '5' },
];

const ATHLETE_SCENES: Scene[] = [
  { id: 'home',     img: '/landing/demo/athlete-home.png',     eyebrowKey: '1', captionKey: '1' },
  { id: 'calendar', img: '/landing/demo/athlete-calendar.png', eyebrowKey: '2', captionKey: '2' },
];

export default function AnimatedDemo({ audience }: { audience: Audience }) {
  const scenes = audience === 'coach' ? COACH_SCENES : ATHLETE_SCENES;
  const tKey = audience === 'coach' ? 'coach' : 'athlete';
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('auth');

  // Reset to first scene when audience flips
  useEffect(() => { setIndex(0); }, [audience]);

  // Preload all images for the current audience
  useEffect(() => {
    scenes.forEach((s) => { const img = new Image(); img.src = s.img; });
  }, [scenes]);

  // Auto-advance, pause on hover or tab hidden
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    if (paused) return () => document.removeEventListener('visibilitychange', onVis);
    const tick = setInterval(() => setIndex((i) => (i + 1) % scenes.length), SCENE_DURATION_MS);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [paused, scenes.length]);

  // Clamp during render: when audience flips coach→athlete, scenes shrinks from 5
  // to 2 before the effect above resets index to 0. Without this, scenes[stale]
  // is undefined and the next line crashes the page.
  const safeIndex = index < scenes.length ? index : 0;
  const scene = scenes[safeIndex];
  const prev = () => setIndex((i) => (i - 1 + scenes.length) % scenes.length);
  const next = () => setIndex((i) => (i + 1) % scenes.length);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Soft warm spotlight behind the phone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 blur-[60px]"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(230,120,30,0.22) 0%, rgba(230,120,30,0.05) 45%, transparent 75%)',
        }}
      />

      {/* Caption track — fixed height so 1- and 2-line captions don't shift the page */}
      <div className="relative mx-auto mb-6 flex min-h-[80px] max-w-sm flex-col items-center justify-end text-center md:mb-8 md:min-h-[88px]">
        <p
          key={`eye-${scene.id}`}
          className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-accent"
          style={{ animation: 'fadeUp 0.5s ease-out both', animationDelay: '80ms' }}
        >
          {t(`landing.demo.${tKey}.scenes.${scene.eyebrowKey}.eyebrow`)}
        </p>
        <p
          key={`cap-${scene.id}`}
          className="mt-2 font-display text-[17px] font-semibold leading-snug tracking-[-0.02em] text-[#111] md:text-lg"
          style={{ animation: 'fadeUp 0.5s ease-out both', animationDelay: '180ms' }}
        >
          {t(`landing.demo.${tKey}.scenes.${scene.captionKey}.caption`)}
        </p>
      </div>

      {/* Phone with side arrows */}
      <div className="relative mx-auto flex items-center justify-center gap-3 md:gap-5">
        <CarouselArrow onClick={prev} direction="prev" ariaLabel="Previous scene" />

        <div className="relative w-[260px] shrink-0 md:w-[320px]">
          <PhoneFrame>
            {/* Stacked images — active one is sharp + at rest; the rest sit
                behind, scaled down, blurred, faded. Switching feels like the
                next frame lifts forward into focus, not a slideshow swap. */}
            {scenes.map((s, i) => {
              const active = i === safeIndex;
              return (
                <img
                  key={s.id}
                  src={s.img}
                  alt=""
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: active ? 1 : 0,
                    transform: active ? 'scale(1)' : 'scale(0.96)',
                    filter: active ? 'blur(0px)' : 'blur(10px)',
                    transition: [
                      `opacity ${TRANSITION_OPACITY_MS}ms ${TRANSITION_EASE}`,
                      `transform ${TRANSITION_SCALE_MS}ms ${TRANSITION_EASE}`,
                      `filter ${TRANSITION_OPACITY_MS}ms ${TRANSITION_EASE}`,
                    ].join(', '),
                    pointerEvents: active ? 'auto' : 'none',
                    willChange: 'opacity, transform, filter',
                  }}
                />
              );
            })}
          </PhoneFrame>
        </div>

        <CarouselArrow onClick={next} direction="next" ariaLabel="Next scene" />
      </div>

      {/* Segmented progress bar */}
      <div className="mx-auto mt-6 flex max-w-[320px] items-center gap-1 md:mt-8">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Scene ${i + 1}`}
            className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[#111]/10"
          >
            <span
              key={`fill-${s.id}-${i === safeIndex ? safeIndex : 'x'}`}
              className="absolute inset-y-0 left-0 bg-[#111]"
              style={{
                width: i < safeIndex ? '100%' : i > safeIndex ? '0%' : undefined,
                animation:
                  i === safeIndex && !paused
                    ? `progressFill ${SCENE_DURATION_MS}ms linear forwards`
                    : undefined,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function CarouselArrow({
  onClick, direction, ariaLabel,
}: { onClick: () => void; direction: 'prev' | 'next'; ariaLabel: string }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#111]/10 bg-white/70 text-[#111]/60 shadow-[0_2px_8px_rgba(17,17,17,0.04)] backdrop-blur transition-all hover:border-[#111]/20 hover:bg-white hover:text-[#111] active:scale-95 sm:flex"
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
