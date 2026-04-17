import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  coachTrack: CoachTrack;
  onContinue: (goal: string) => void;
}

export default function QuestionnaireGoal({ coachTrack, onContinue }: Props) {
  const { t } = useTranslation('auth');
  const [selected, setSelected] = useState<string | null>(null);

  const options = coachTrack === 'member' ? memberOptions(t) : ownerOptions(t, coachTrack === 'owner');

  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold text-foreground leading-tight">{t('questionnaire.coach.goalTitle')}</h1>
      <p className="mb-6 text-base text-muted-foreground leading-snug">{t('questionnaire.coach.goalSubtitle')}</p>

      <div className="space-y-2.5 mb-6">
        {options.map((opt) => {
          const isActive = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-all min-h-[56px] ${
                isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <span className="text-2xl shrink-0">{opt.icon}</span>
              <span className="flex-1 text-base font-medium text-foreground leading-snug">{opt.label}</span>
              {isActive && <Check className="h-5 w-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => selected && onContinue(selected)}
        disabled={!selected}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground disabled:opacity-50 min-h-[48px]"
      >
        {t('questionnaire.common.continue')}
      </button>
    </div>
  );
}

function ownerOptions(t: (k: string) => string, showSchoolOverview: boolean) {
  const base = [
    { key: 'stop_chasing', icon: '💬', label: t('questionnaire.coach.goalOwnerOption1') },
    { key: 'fill_spots', icon: '🔄', label: t('questionnaire.coach.goalOwnerOption2') },
    { key: 'track_payments', icon: '💳', label: t('questionnaire.coach.goalOwnerOption3') },
  ];
  if (showSchoolOverview) {
    base.push({ key: 'school_overview', icon: '🏫', label: t('questionnaire.coach.goalOwnerOption4') });
  }
  base.push({ key: 'all', icon: '✨', label: t('questionnaire.coach.goalOwnerOption5') });
  return base;
}

function memberOptions(t: (k: string) => string) {
  return [
    { key: 'week_view', icon: '📅', label: t('questionnaire.coach.goalMemberOption1') },
    { key: 'know_attendance', icon: '👀', label: t('questionnaire.coach.goalMemberOption2') },
    { key: 'track_sessions', icon: '💳', label: t('questionnaire.coach.goalMemberOption3') },
    { key: 'messaging', icon: '💭', label: t('questionnaire.coach.goalMemberOption4') },
    { key: 'all', icon: '✨', label: t('questionnaire.coach.goalMemberOption5') },
  ];
}
