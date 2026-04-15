import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, CheckCircle2, Wallet, X } from 'lucide-react';
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
      <h1 className="mb-6 text-2xl font-bold text-foreground">{title}</h1>

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
        {t('questionnaire.common.getStarted')}
      </button>
    </div>
  );
}

function MiniBenefit({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-2.5 text-center">
      <div className="text-lg leading-none mb-1">{icon}</div>
      <div className="text-[11px] font-medium leading-tight text-foreground">{label}</div>
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
          <div className="text-xs font-medium text-muted-foreground">Tomorrow · 18:00</div>
          <div className="font-semibold text-foreground">Tennis · Court 3</div>
        </div>
        <div className="relative h-6 w-[88px]">
          <div
            className={`absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-success/15 text-[11px] font-semibold text-success transition-all duration-300 ${
              isCancelled ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
            }`}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            Booked
          </div>
          <div
            className={`absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-destructive/15 text-[11px] font-semibold text-destructive transition-all duration-500 ${
              isCancelled ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <X className="h-3 w-3" strokeWidth={3} />
            Cancelled
          </div>
        </div>
      </div>

      {/* Animated cancel button → gets "tapped" → collapses into confirmation */}
      <div className="relative mt-3 h-10">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center rounded-lg border border-destructive/40 bg-destructive/5 text-sm font-semibold text-destructive transition-all duration-200 ${
            isCancelled ? 'opacity-0 scale-95' : stage === 'tapping' ? 'opacity-100 scale-[0.97] bg-destructive/15' : 'opacity-100 scale-100'
          }`}
        >
          Can't make it? Cancel
        </button>
        <div
          className={`absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground transition-opacity duration-500 ${
            isCancelled ? 'opacity-100' : 'opacity-0'
          }`}
        >
          One tap. Coach & waitlist are notified.
        </div>
      </div>

      {/* Pass balance — refunded when the session is cancelled */}
      <div className="mt-4 h-px bg-border/60" />
      <div className="mt-3 flex items-center gap-2 text-xs">
        <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
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

function CoachPreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Today · 18:00</div>
            <div className="font-semibold text-foreground">Monday Tennis · Court 3</div>
          </div>
          <div className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">4/4</div>
        </div>
        <div className="h-px bg-border/60" />
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">All confirmed — no chasing needed</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Next: Tuesday 17:00 · 3/4 signed up</span>
        </div>
      </div>
    </div>
  );
}
