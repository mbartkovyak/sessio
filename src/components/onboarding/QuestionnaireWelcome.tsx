import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Wallet, X } from 'lucide-react';
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

// School/coach welcome — animated session that fills up automatically.
// The 4th spot joins after a short delay, badge bumps from 3/4 → 4/4,
// and the "All confirmed" caption fades in. Loops continuously.
const COACH_ATHLETES = [
  { name: 'Anna', initials: 'A' },
  { name: 'Marek', initials: 'M' },
  { name: 'Kasia', initials: 'K' },
  { name: 'Tomek', initials: 'T' },
] as const;

function CoachPreview() {
  const [confirmedCount, setConfirmedCount] = useState(3);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setConfirmedCount(3);
      timers.push(setTimeout(() => setConfirmedCount(4), 1600));
      timers.push(setTimeout(cycle, 4200));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const isFull = confirmedCount === 4;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Today · 18:00</div>
          <div className="text-base font-semibold text-foreground">Monday Tennis · Court 3</div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-500 ${
            isFull ? 'bg-success/15 text-success scale-105' : 'bg-secondary text-muted-foreground'
          }`}
        >
          {confirmedCount}/4
        </div>
      </div>

      {/* Animated confirmation slots */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {COACH_ATHLETES.map((a, i) => {
          const confirmed = i < confirmedCount;
          return (
            <div
              key={a.name}
              className={`flex flex-col items-center gap-1.5 rounded-lg border-2 py-2.5 transition-all duration-500 ${
                confirmed ? 'border-success/40 bg-success/5' : 'border-dashed border-border bg-transparent'
              }`}
            >
              <div
                className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
                  confirmed ? 'bg-success text-white scale-100' : 'bg-muted text-muted-foreground scale-90'
                }`}
              >
                {a.initials}
                {confirmed && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success ring-2 ring-card">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium transition-colors ${confirmed ? 'text-foreground' : 'text-muted-foreground'}`}>
                {a.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Caption fades in when the group fills up */}
      <div
        className={`mt-4 text-center text-sm font-medium transition-all duration-500 ${
          isFull ? 'opacity-100 text-success translate-y-0' : 'opacity-0 -translate-y-1'
        }`}
      >
        ✨ All confirmed — no chasing needed
      </div>
    </div>
  );
}
