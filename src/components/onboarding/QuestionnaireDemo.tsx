import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, CheckCircle2, XCircle } from 'lucide-react';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  coachTrack: CoachTrack;
  onContinue: () => void;
}

// 3-slot session. All full → one cancels (2/3) → waitlist fills (3/3).
type DemoStage = 'full' | 'cancelled' | 'backfilled';

export default function QuestionnaireDemo({ coachTrack: _coachTrack, onContinue }: Props) {
  const { t } = useTranslation('auth');
  const [stage, setStage] = useState<DemoStage>('full');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setStage('full');
      timers.push(setTimeout(() => setStage('cancelled'), 2000));
      timers.push(setTimeout(() => setStage('backfilled'), 4200));
      timers.push(setTimeout(cycle, 7000));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const spots = stage === 'cancelled' ? 2 : 3;
  const isFull = stage !== 'cancelled';

  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold text-foreground leading-tight">{t('questionnaire.coach.demoSetupTitle')}</h1>
      <p className="mb-5 text-base text-muted-foreground leading-snug">{t('questionnaire.coach.demoSetupBody')}</p>

      <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎾</span>
            <div>
              <div className="text-base font-semibold text-foreground">{t('questionnaire.coach.demoCardTitle')}</div>
              <div className="text-xs text-muted-foreground">Today · 18:00 – 19:30</div>
            </div>
          </div>
          <div
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-all duration-400 ${
              isFull ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}
          >
            {spots}/3
          </div>
        </div>

        {/* Participant rows */}
        <div className="divide-y divide-border">
          {/* Anna — always confirmed */}
          <div className="flex items-center gap-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">AK</div>
            <span className="flex-1 text-sm font-medium text-foreground">Anna Kowalska</span>
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          </div>

          {/* Marek — confirmed → cancels */}
          <div className="flex items-center gap-3 py-2.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
              stage === 'cancelled' ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-foreground'
            }`}>MN</div>
            <span className={`flex-1 text-sm font-medium transition-all duration-500 ${
              stage === 'cancelled' ? 'text-muted-foreground line-through' : 'text-foreground'
            }`}>Marek Nowak</span>
            <div className="relative h-5 w-5 shrink-0">
              <CheckCircle2 className={`absolute inset-0 h-5 w-5 text-success transition-all duration-400 ${
                stage === 'cancelled' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
              }`} />
              <XCircle className={`absolute inset-0 h-5 w-5 text-destructive transition-all duration-400 ${
                stage === 'cancelled' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`} />
            </div>
          </div>

          {/* Kasia — always confirmed */}
          <div className="flex items-center gap-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">KW</div>
            <span className="flex-1 text-sm font-medium text-foreground">Kasia Wiśniewska</span>
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          </div>

          {/* Tomek — appears from waitlist on backfill */}
          <div className={`flex items-center gap-3 py-2.5 transition-all duration-500 ${
            stage === 'backfilled' ? 'opacity-100 max-h-20' : stage === 'cancelled' ? 'opacity-0 max-h-0 py-0 overflow-hidden' : 'opacity-100 max-h-20'
          }`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
              stage === 'backfilled' ? 'bg-success/15 text-success' : 'bg-secondary text-foreground'
            }`}>TL</div>
            <span className={`flex-1 text-sm font-medium transition-all duration-500 ${
              stage === 'backfilled' ? 'text-success font-semibold' : 'text-foreground'
            }`}>
              {stage === 'backfilled' ? 'Tomek Lis' : 'Tomek Lis'}
            </span>
            <CheckCircle2 className={`h-5 w-5 shrink-0 transition-all duration-400 ${
              stage === 'backfilled' ? 'text-success scale-110' : 'text-success'
            }`} />
          </div>
        </div>
      </div>

      {/* Fixed-height caption area — no layout jumps */}
      <div className="mb-5 h-12 flex items-center justify-center text-center">
        <p className={`text-sm font-medium transition-opacity duration-500 ${
          stage === 'full' ? 'opacity-100 text-success' : 'opacity-0'
        }`}>
          {t('questionnaire.coach.demoCaptionFull')}
        </p>
        <p className={`absolute text-sm font-medium transition-opacity duration-500 ${
          stage === 'cancelled' ? 'opacity-100 text-destructive' : 'opacity-0'
        }`}>
          {t('questionnaire.coach.demoCaptionCancel')}
        </p>
        <p className={`absolute text-sm font-medium transition-opacity duration-500 ${
          stage === 'backfilled' ? 'opacity-100 text-success' : 'opacity-0'
        }`}>
          {t('questionnaire.coach.demoCaptionBackfill')}
        </p>
      </div>

      {/* Stat — prominent */}
      <div className="mb-5 rounded-xl bg-primary/10 p-4 text-center">
        <p className="text-base font-bold text-primary leading-snug">{t('questionnaire.coach.demoOutputStat')}</p>
      </div>

      <button
        onClick={onContinue}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground min-h-[48px]"
      >
        {t('questionnaire.common.continue')}
      </button>
    </div>
  );
}
