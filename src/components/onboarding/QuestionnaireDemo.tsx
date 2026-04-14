import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, X, Check, Clock } from 'lucide-react';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  coachTrack: CoachTrack;
  onContinue: () => void;
}

type DemoStage = 'setup' | 'before' | 'cancelled' | 'backfilled' | 'output';

interface Participant {
  name: string;
  initials: string;
  status: 'signed_up' | 'cancelled' | 'waitlist';
}

const INITIAL: Participant[] = [
  { name: 'Anna', initials: 'A', status: 'signed_up' },
  { name: 'Marek', initials: 'M', status: 'signed_up' },
  { name: 'Kasia', initials: 'K', status: 'signed_up' },
  { name: 'Tomek', initials: 'T', status: 'waitlist' },
];

export default function QuestionnaireDemo({ coachTrack: _coachTrack, onContinue }: Props) {
  const { t } = useTranslation('auth');
  const [stage, setStage] = useState<DemoStage>('setup');
  const [participants, setParticipants] = useState<Participant[]>(INITIAL);

  useEffect(() => {
    if (stage === 'setup') return;
    if (stage === 'output') return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (stage === 'before') {
      timers.push(setTimeout(() => setStage('cancelled'), 2500));
    }
    if (stage === 'cancelled') {
      timers.push(setTimeout(() => {
        setParticipants((prev) => prev.map((p) => p.name === 'Marek' ? { ...p, status: 'cancelled' } : p));
      }, 300));
      timers.push(setTimeout(() => setStage('backfilled'), 2000));
    }
    if (stage === 'backfilled') {
      timers.push(setTimeout(() => {
        setParticipants((prev) => prev.map((p) => p.name === 'Tomek' ? { ...p, status: 'signed_up' } : p));
      }, 400));
      timers.push(setTimeout(() => setStage('output'), 2500));
    }

    return () => { timers.forEach(clearTimeout); };
  }, [stage]);

  function handlePlay() {
    setParticipants(INITIAL);
    setStage('before');
  }

  if (stage === 'output') {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">{t('questionnaire.coach.demoOutputTitle')}</h1>
        <p className="mb-6 text-muted-foreground">{t('questionnaire.coach.demoOutputBody')}</p>
        <div className="mb-6 rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">{t('questionnaire.coach.demoOutputStat')}</p>
        </div>
        <button
          onClick={onContinue}
          className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground min-h-[44px]"
        >
          {t('questionnaire.common.continue')}
        </button>
      </div>
    );
  }

  const signedUpCount = participants.filter((p) => p.status === 'signed_up').length;

  const caption = stage === 'setup'
    ? ''
    : stage === 'before'
      ? t('questionnaire.coach.demoCaptionBefore')
      : stage === 'cancelled'
        ? t('questionnaire.coach.demoCaptionCancel')
        : t('questionnaire.coach.demoCaptionBackfill');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">{t('questionnaire.coach.demoSetupTitle')}</h1>
      <p className="mb-6 text-muted-foreground">{t('questionnaire.coach.demoSetupBody')}</p>

      {/* Sample training card */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-foreground">{t('questionnaire.coach.demoCardTitle')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t('questionnaire.coach.demoCardSpots', { count: signedUpCount })}
            </div>
          </div>
          {stage !== 'setup' && (
            <div className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{caption.split('...')[0]}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {participants.map((p) => (
            <ParticipantRow key={p.name} participant={p} />
          ))}
        </div>
      </div>

      {/* Caption below card for legibility */}
      <div className="mb-6 min-h-[1.5rem] text-center text-sm text-muted-foreground transition-opacity duration-300">
        {caption && <span>{caption}</span>}
      </div>

      {stage === 'setup' ? (
        <button
          onClick={handlePlay}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground min-h-[44px]"
        >
          <Play className="h-4 w-4" fill="currentColor" />
          {t('questionnaire.common.play')}
        </button>
      ) : (
        <div className="flex w-full items-center justify-center py-3.5 text-sm text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary mr-2" />
          Playing...
        </div>
      )}
    </div>
  );
}

function ParticipantRow({ participant }: { participant: Participant }) {
  const { t } = useTranslation('auth');

  const bg = participant.status === 'signed_up'
    ? 'bg-success/10 border-success/30'
    : participant.status === 'cancelled'
      ? 'bg-destructive/10 border-destructive/30'
      : 'bg-secondary/60 border-border';

  const avatarBg = participant.status === 'signed_up'
    ? 'bg-success text-white'
    : participant.status === 'cancelled'
      ? 'bg-destructive/70 text-white line-through'
      : 'bg-muted text-muted-foreground';

  const label = participant.status === 'signed_up'
    ? t('questionnaire.coach.demoStatusSignedUp')
    : participant.status === 'cancelled'
      ? t('questionnaire.coach.demoStatusCancelled')
      : t('questionnaire.coach.demoStatusWaitlist');

  const icon = participant.status === 'signed_up'
    ? <Check className="h-3 w-3" />
    : participant.status === 'cancelled'
      ? <X className="h-3 w-3" />
      : null;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-500 ${bg}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${avatarBg}`}>
        {participant.initials}
      </div>
      <div className="flex-1 text-sm font-medium text-foreground">{participant.name}</div>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
    </div>
  );
}
