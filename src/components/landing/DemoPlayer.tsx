import { useState, useRef, useEffect } from 'react';
import { Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Audience } from './useLandingAudience';

export default function DemoPlayer({ audience }: { audience: Audience }) {
  const { t } = useTranslation('auth');
  const [modalOpen, setModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const base = `/video/demo-${audience}`;
  const loopSrc = `${base}.webm`;
  const loopSrcMp4 = `${base}.mp4`;
  const fullSrc = `${base}-full.mp4`;
  const poster = `${base}-poster.jpg`;

  // Reset loaded state when audience changes so the new video can load
  useEffect(() => {
    setLoaded(false);
    // Give the video element a moment to re-evaluate sources after src change
    requestAnimationFrame(() => videoRef.current?.load());
  }, [audience]);

  return (
    <div className="relative mt-12 md:mt-16">
      {/* Spotlight glow behind the video */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-24 blur-[80px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(230,120,30,0.35) 0%, rgba(230,120,30,0.12) 40%, transparent 70%)',
        }}
      />

      {/* Subtle grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          mask: 'radial-gradient(ellipse 70% 80% at 50% 50%, #000 40%, transparent 80%)',
          WebkitMask: 'radial-gradient(ellipse 70% 80% at 50% 50%, #000 40%, transparent 80%)',
        }}
      />

      {/* Video frame */}
      <div className="relative mx-auto max-w-4xl rounded-2xl border border-white/10 bg-black/60 p-1.5 shadow-[0_20px_80px_-20px_rgba(230,120,30,0.35)] backdrop-blur-sm">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1713] via-[#15120e] to-[#0e0b08] aspect-video">
          {/* Fallback placeholder — visible while video isn't loaded or if missing */}
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-white/40">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-sm">
                  <Play className="h-5 w-5 translate-x-0.5 fill-white/80 text-white/80" />
                </div>
                <span className="text-xs font-medium uppercase tracking-[0.22em]">
                  {t(`landing.hero.${audience}.videoComingSoon`)}
                </span>
              </div>
            </div>
          )}

          {/* Autoplay muted loop */}
          <video
            ref={videoRef}
            key={audience}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={poster}
            onCanPlay={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src={loopSrc} type="video/webm" />
            <source src={loopSrcMp4} type="video/mp4" />
          </video>

          {/* Play button overlay (opens modal) — only interactive when a full demo might exist */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label="Watch full demo"
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 bg-black/20"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[0_0_40px_rgba(255,255,255,0.4)]">
              <Play className="h-6 w-6 translate-x-0.5 fill-[#111] text-[#111]" />
            </span>
          </button>
        </div>
      </div>

      {/* Full-version modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden bg-black" onClick={(e) => e.stopPropagation()}>
            <video
              key={`full-${audience}`}
              autoPlay
              controls
              playsInline
              poster={poster}
              className="h-full w-full object-cover"
            >
              <source src={fullSrc} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
