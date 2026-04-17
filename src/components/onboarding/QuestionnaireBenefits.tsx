import { useTranslation } from 'react-i18next';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  audience: 'athlete' | 'coach';
  coachTrack?: CoachTrack;
  onContinue: () => void;
}

export default function QuestionnaireBenefits({ audience, coachTrack, onContinue }: Props) {
  const { t } = useTranslation('auth');

  const isAthlete = audience === 'athlete';
  const items = isAthlete ? athleteItems(t) : coachItems(t, coachTrack);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground leading-tight">
        {isAthlete ? t('questionnaire.athlete.benefitsTitle') : t('questionnaire.coach.benefitsTitle')}
      </h1>

      <div className="space-y-5 mb-6">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-foreground">{item.title}</div>
              <div className="text-sm text-muted-foreground mt-1 leading-snug">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground min-h-[48px]"
      >
        {t('questionnaire.common.next')}
      </button>
    </div>
  );
}

function athleteItems(t: (k: string) => string) {
  return [
    { icon: '✓', title: t('questionnaire.athlete.benefit1Title'), desc: t('questionnaire.athlete.benefit1Desc') },
    { icon: '💳', title: t('questionnaire.athlete.benefit2Title'), desc: t('questionnaire.athlete.benefit2Desc') },
    { icon: '📅', title: t('questionnaire.athlete.benefit3Title'), desc: t('questionnaire.athlete.benefit3Desc') },
  ];
}

function coachItems(t: (k: string) => string, track?: CoachTrack) {
  if (track === 'member') {
    return [
      { icon: '📅', title: t('questionnaire.coach.benefitMember1Title'), desc: t('questionnaire.coach.benefitMember1Desc') },
      { icon: '👀', title: t('questionnaire.coach.benefitMember2Title'), desc: t('questionnaire.coach.benefitMember2Desc') },
      { icon: '🔄', title: t('questionnaire.coach.benefitMember3Title'), desc: t('questionnaire.coach.benefitMember3Desc') },
      { icon: '💭', title: t('questionnaire.coach.benefitMember4Title'), desc: t('questionnaire.coach.benefitMember4Desc') },
    ];
  }
  const items = [
    { icon: '⚡', title: t('questionnaire.coach.benefitOwner1Title'), desc: t('questionnaire.coach.benefitOwner1Desc') },
    { icon: '🔄', title: t('questionnaire.coach.benefitOwner2Title'), desc: t('questionnaire.coach.benefitOwner2Desc') },
    { icon: '💳', title: t('questionnaire.coach.benefitOwner3Title'), desc: t('questionnaire.coach.benefitOwner3Desc') },
  ];
  if (track === 'owner') {
    items.push({ icon: '🏫', title: t('questionnaire.coach.benefitOwner4Title'), desc: t('questionnaire.coach.benefitOwner4Desc') });
  }
  return items;
}
