import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, CheckCircle2 } from 'lucide-react';
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
      <h1 className="mb-8 text-2xl font-bold text-foreground">{title}</h1>

      {isAthlete ? <AthleteAnimatedPreview /> : <CoachPreview />}

      <button
        onClick={onContinue}
        className="mt-8 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground min-h-[44px]"
      >
        {t('questionnaire.common.getStarted')}
      </button>
    </div>
  );
}

type AthleteStage = 'available' | 'tapping' | 'signed_up';

function AthleteAnimatedPreview() {
  const [stage, setStage] = useState<AthleteStage>('available');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setStage('available');
      timers.push(setTimeout(() => setStage('tapping'), 1400));
      timers.push(setTimeout(() => setStage('signed_up'), 1900));
      timers.push(setTimeout(cycle, 3800));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const isSignedUp = stage === 'signed_up';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Tomorrow · 18:00</div>
          <div className="font-semibold text-foreground">Tennis · Court 3</div>
        </div>
        <div className="text-2xl">🎾</div>
      </div>

      {/* Animated status chip + button morphing */}
      <div className="relative h-11">
        {/* Available state */}
        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 text-sm font-semibold text-primary transition-all duration-300 ${
            stage === 'available' ? 'opacity-100 scale-100' : stage === 'tapping' ? 'opacity-100 scale-95 bg-primary/15' : 'opacity-0 scale-90'
          }`}
        >
          Tap to confirm
        </div>
        {/* Signed up state */}
        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-white transition-all duration-500 ${
            isSignedUp ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
          Signed up
        </div>
      </div>

      {/* Caption fades in with the confirm */}
      <div
        className={`mt-3 text-center text-xs text-muted-foreground transition-opacity duration-500 ${
          isSignedUp ? 'opacity-100' : 'opacity-0'
        }`}
      >
        One tap. Your coach knows.
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
