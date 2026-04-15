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
      <h1 className="mb-3 text-3xl font-bold text-foreground leading-tight">
        {t('questionnaire.coach.finishTitle', { firstName })}
      </h1>
      <p className="mb-6 text-base text-muted-foreground leading-snug">{subtitle}</p>

      <div className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2.5 text-base">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span className="text-foreground">{t('questionnaire.coach.finishChecklist1')}</span>
        </div>
        <div className="flex items-center gap-2.5 text-base">
          <CheckCircle2 className={`h-5 w-5 ${notificationsEnabled ? 'text-success' : 'text-muted-foreground'}`} />
          <span className="text-foreground">
            {notificationsEnabled
              ? t('questionnaire.coach.finishChecklist2Enabled')
              : t('questionnaire.coach.finishChecklist2Skipped')}
          </span>
        </div>
      </div>

      <button
        onClick={onPrimary}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground min-h-[48px]"
      >
        {primaryLabel}
      </button>
      <button
        onClick={onSecondary}
        className="mt-3 w-full text-base text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        {t('questionnaire.common.goHome')}
      </button>
    </div>
  );
}
