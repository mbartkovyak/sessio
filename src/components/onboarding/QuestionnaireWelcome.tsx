import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Wallet, X, XCircle } from 'lucide-react';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  audience: 'athlete' | 'coach';
  coachTrack?: CoachTrack;
  onContinue: () => void;
}

export default function QuestionnaireWelcome({ audience, coachTrack, onContinue }: Props) {
  const { t } = useTranslation('auth');

  const isAthlete = audience === 'athlete';
  const title = isAthlete
    ? t('questionnaire.athlete.welcomeTitle')
    : coachTrack === 'owner'
      ? t('questionnaire.coach.welcomeTitleOwner')
      : coachTrack === 'member'
        ? t('questionnaire.coach.welcomeTitleMember')
        : t('questionnaire.coach.welcomeTitleSolo');

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground leading-tight">{title}</h1>

      {isAthlete ? <AthleteAnimatedPreview /> : <CoachPreview />}

      {isAthlete && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniBenefit icon="⚡" label={t('questionnaire.athlete.miniBenefit1')} />
          <MiniBenefit icon="💳" label={t('questionnaire.athlete.miniBenefit2')} />
          <MiniBenefit icon="📅" label={t('questionnaire.athlete.miniBenefit3')} />
        </div>
      )}

      <button
        onClick={onContinue}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground min-h-[44px]"
      >
        {t('questionnaire.common.next')}
      </button>
    </div>
  );
}

function MiniBenefit({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-3 text-center">
      <div className="text-2xl leading-none mb-1.5">{icon}</div>
      <div className="text-xs font-semibold leading-tight text-foreground">{label}</div>
    </div>
  );
}

// Athletes are auto-enrolled in their coach's recurring trainings.
// They only need to act when they *can't* make it. The animation shows
// that one-tap cancellation — not a confirmation they don't need to do.
type AthleteStage = 'signed_up' | 'tapping' | 'cancelled';

function AthleteAnimatedPreview() {
  const [stage, setStage] = useState<AthleteStage>('signed_up');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setStage('signed_up');
      timers.push(setTimeout(() => setStage('tapping'), 2000));
      timers.push(setTimeout(() => setStage('cancelled'), 2400));
      timers.push(setTimeout(cycle, 4800));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const isCancelled = stage === 'cancelled';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* Session header with animated status chip */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Tomorrow · 18:00</div>
          <div className="text-base font-semibold text-foreground">Tennis · Court 3</div>
        </div>
        <div className="relative h-7 w-[100px]">
          <div
            className={`absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-success/15 text-xs font-semibold text-success transition-all duration-300 ${
              isCancelled ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            Booked
          </div>
          <div
            className={`absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-destructive/15 text-xs font-semibold text-destructive transition-all duration-500 ${
              isCancelled ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
            Cancelled
          </div>
        </div>
      </div>

      {/* Animated cancel button → gets "tapped" → collapses into confirmation */}
      <div className="relative mt-4 h-11">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center rounded-lg border border-destructive/40 bg-destructive/5 text-base font-semibold text-destructive transition-all duration-200 ${
            isCancelled ? 'opacity-0 scale-95' : stage === 'tapping' ? 'opacity-100 scale-[0.97] bg-destructive/15' : 'opacity-100 scale-100'
          }`}
        >
          Can't make it? Cancel
        </button>
        <div
          className={`absolute inset-0 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-opacity duration-500 text-center px-2 ${
            isCancelled ? 'opacity-100' : 'opacity-0'
          }`}
        >
          One tap. Coach & waitlist are notified.
        </div>
      </div>

      {/* Pass balance — refunded when the session is cancelled */}
      <div className="mt-5 h-px bg-border/60" />
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Wallet className="h-4 w-4 text-primary shrink-0" />
        <span className="text-muted-foreground">Pass balance</span>
        <span
          key={isCancelled ? 'refunded' : 'before'}
          className={`ml-auto font-semibold tabular-nums transition-colors duration-300 ${
            isCancelled ? 'text-success' : 'text-foreground'
          }`}
        >
          {isCancelled ? '9' : '8'} sessions left
        </span>
      </div>
    </div>
  );
}

// Coach welcome — mirrors the real AttendanceSheet flow. Coach opens the
// session, taps "Mark all present", and every athlete flips from absent
// (grey XCircle) to present (success CheckCircle2) in a staggered sweep.
// Loops continuously.
const COACH_ATHLETES = [
  { name: 'Anna Kowalska', initials: 'AK' },
  { name: 'Marek Nowak', initials: 'MN' },
  { name: 'Kasia Wiśniewska', initials: 'KW' },
  { name: 'Tomek Lis', initials: 'TL' },
] as const;

type CoachStage = 'idle' | 'tapping' | 'all_present';

function CoachPreview() {
  const [stage, setStage] = useState<CoachStage>('idle');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setStage('idle');
      timers.push(setTimeout(() => setStage('tapping'), 1400));
      timers.push(setTimeout(() => setStage('all_present'), 1750));
      timers.push(setTimeout(cycle, 4600));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const allPresent = stage === 'all_present';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* Session header — matches AttendanceSheet */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎾</span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">Monday Tennis</h3>
          <p className="text-xs text-muted-foreground">Today · 18:00 – 19:30</p>
        </div>
      </div>

      {/* "Mark all present" quick action — gets "tapped" in animation */}
      <div
        role="button"
        aria-hidden
        className={`mb-2 flex items-center justify-center rounded-lg bg-success/10 py-2 text-xs font-semibold text-success transition-all duration-200 ${
          stage === 'tapping' ? 'scale-[0.97] bg-success/25' : 'scale-100'
        } ${allPresent ? 'opacity-60' : 'opacity-100'}`}
      >
        Mark all present
      </div>

      {/* Participant list — staggered attendance sweep */}
      <div className="divide-y divide-border">
        {COACH_ATHLETES.map((a, i) => (
          <div key={a.name} className="flex items-center gap-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
              {a.initials}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground truncate">{a.name}</span>
            <div className="relative h-6 w-6 shrink-0">
              <XCircle
                className={`absolute inset-0 h-6 w-6 text-muted-foreground/40 transition-opacity duration-300 ${
                  allPresent ? 'opacity-0' : 'opacity-100'
                }`}
                style={{ transitionDelay: `${i * 90}ms` }}
              />
              <CheckCircle2
                className={`absolute inset-0 h-6 w-6 text-success transition-all duration-300 ${
                  allPresent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
                style={{ transitionDelay: `${i * 90}ms` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Caption fades in once everyone is marked */}
      <div
        className={`mt-3 text-center text-sm font-medium transition-all duration-500 ${
          allPresent ? 'opacity-100 text-success translate-y-0' : 'opacity-0 translate-y-1'
        }`}
      >
        ✨ Attendance done — one tap
      </div>
    </div>
  );
}
