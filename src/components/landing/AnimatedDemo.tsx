import { useEffect, useState } from 'react';
import type { Audience } from './useLandingAudience';
import CoachReEngageScene from './scenes/CoachReEngageScene';
import CoachFillHoursScene from './scenes/CoachFillHoursScene';
import AthleteConfirmScene from './scenes/AthleteConfirmScene';
import AthleteReminderScene from './scenes/AthleteReminderScene';

const SCENE_DURATION_MS = 5200;

const COACH_SCENES = [
  { id: 'coach-reengage', Component: CoachReEngageScene },
  { id: 'coach-fill', Component: CoachFillHoursScene },
] as const;

const ATHLETE_SCENES = [
  { id: 'athlete-confirm', Component: AthleteConfirmScene },
  { id: 'athlete-reminder', Component: AthleteReminderScene },
] as const;

export default function AnimatedDemo({ audience }: { audience: Audience }) {
  const scenes = audience === 'coach' ? COACH_SCENES : ATHLETE_SCENES;
  const [index, setIndex] = useState(0);

  // Reset to scene 0 whenever the audience flips — keeps the loop starting at the right scene.
  useEffect(() => { setIndex(0); }, [audience]);

  // Auto-rotate.
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % scenes.length), SCENE_DURATION_MS);
    return () => clearInterval(id);
  }, [scenes.length]);

  const Scene = scenes[index].Component;
  const sceneKey = `${audience}-${scenes[index].id}`;

  return (
    <div className="relative mt-12 md:mt-16">
      {/* Spotlight glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-20 blur-[70px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(230,120,30,0.25) 0%, rgba(230,120,30,0.08) 40%, transparent 70%)',
        }}
      />

      {/* Outer frame — a single white card with a soft shadow, holding the animated scene */}
      <div className="relative mx-auto max-w-4xl rounded-3xl border border-[#111]/8 bg-white p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] md:p-5">
        <div className="relative overflow-hidden rounded-2xl bg-[#faf7f2] aspect-[16/10]">
          {/* Keyed scene — remounts cleanly on switch, restarts its internal animation */}
          <Scene key={sceneKey} />
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Scene ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-[#111]' : 'w-1.5 bg-[#111]/20 hover:bg-[#111]/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
