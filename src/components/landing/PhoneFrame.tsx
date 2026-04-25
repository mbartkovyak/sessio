import type { ReactNode } from 'react';

// Lightweight iPhone-shape bezel wrapper for the hero demo. Pure CSS.
// Maintains 19.5:9 aspect ratio (iPhone 13/14). Children render inside
// the inner "screen" rectangle, clipped and radius-matched.
export default function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{ aspectRatio: '9 / 19.5' }}
    >
      {/* Outer bezel */}
      <div className="absolute inset-0 rounded-[46px] bg-[#0E0E0E] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset] md:rounded-[54px]" />

      {/* Inner screen */}
      <div className="absolute inset-[6px] overflow-hidden rounded-[40px] bg-[#faf7f2] md:inset-[8px] md:rounded-[48px]">
        {children}
      </div>

      {/* Dynamic Island placeholder — subtle pill at the top-center */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[14px] z-10 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-[#0E0E0E] md:top-[18px] md:h-[26px] md:w-[100px]"
      />
    </div>
  );
}
