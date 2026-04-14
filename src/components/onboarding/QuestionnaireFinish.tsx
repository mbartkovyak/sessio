import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  coachTrack: CoachTrack;
  firstName: string;
  notificationsEnabled: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
}

export default function QuestionnaireFinish({ coachTrack, firstName, notificationsEnabled, onPrimary, onSecondary }: Props) {
  const { t } = useTranslation('auth');

  const subtitle = coachTrack === 'member'
    ? t('questionnaire.coach.finishSubtitleMember')
    : t('questionnaire.coach.finishSubtitleOwner');

  const primaryLabel = coachTrack === 'member'
    ? t('questionnaire.coach.finishCtaMember')
    : t('questionnaire.coach.finishCtaOwner');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        {t('questionnaire.coach.finishTitle', { firstName })}
      </h1>
      <p className="mb-6 text-muted-foreground">{subtitle}</p>

      <div className="mb-6 space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-foreground">{t('questionnaire.coach.finishChecklist1')}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <CheckCircle2 className={`h-4 w-4 ${notificationsEnabled ? 'text-success' : 'text-muted-foreground'}`} />
          <span className="text-foreground">
            {notificationsEnabled
              ? t('questionnaire.coach.finishChecklist2Enabled')
              : t('questionnaire.coach.finishChecklist2Skipped')}
          </span>
        </div>
      </div>

      <button
        onClick={onPrimary}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground min-h-[44px]"
      >
        {primaryLabel}
      </button>
      <button
        onClick={onSecondary}
        className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground min-h-[36px]"
      >
        {t('questionnaire.common.goHome')}
      </button>
    </div>
  );
}
