import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { SPORTS, SPORT_ICONS, sportLabel } from '@/lib/constants';

interface Props {
  onContinue: (sports: string[]) => void;
}

export default function QuestionnaireAthleteSports({ onContinue }: Props) {
  const { t } = useTranslation('auth');
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(sport: string) {
    setSelected((prev) => prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]);
  }

  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold text-foreground leading-tight">
        {t('questionnaire.athlete.sportsTitle')}
      </h1>
      <p className="mb-6 text-base text-muted-foreground leading-snug">
        {t('questionnaire.athlete.sportsSubtitle')}
      </p>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {SPORTS.map((sport) => {
          const isActive = selected.includes(sport);
          return (
            <button
              key={sport}
              type="button"
              onClick={() => toggle(sport)}
              className={`relative flex items-center gap-3 rounded-xl border-2 px-3 py-3.5 text-left transition-all min-h-[64px] ${
                isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <span className="text-2xl shrink-0">{SPORT_ICONS[sport] ?? '🎯'}</span>
              <span className="flex-1 text-base font-medium text-foreground">{sportLabel(sport)}</span>
              {isActive && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onContinue(selected)}
        disabled={selected.length === 0}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground disabled:opacity-50 min-h-[48px]"
      >
        {t('questionnaire.common.continue')}
      </button>
      <button
        onClick={() => onContinue([])}
        className="mt-2 w-full text-base text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        {t('questionnaire.athlete.sportsSkip')}
      </button>
    </div>
  );
}
