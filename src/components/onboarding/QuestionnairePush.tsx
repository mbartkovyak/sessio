import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/shared/usePushNotifications';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  audience: 'athlete' | 'coach';
  coachTrack?: CoachTrack;
  onDone: (enabled: boolean) => void;
}

export default function QuestionnairePush({ audience, coachTrack, onDone }: Props) {
  const { t } = useTranslation('auth');
  const { supported, subscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  const bullets = audience === 'athlete'
    ? [t('questionnaire.athlete.pushBullet1'), t('questionnaire.athlete.pushBullet2'), t('questionnaire.athlete.pushBullet3')]
    : coachTrack === 'member'
      ? [t('questionnaire.coach.pushMemberBullet1'), t('questionnaire.coach.pushMemberBullet2'), t('questionnaire.coach.pushMemberBullet3')]
      : [t('questionnaire.coach.pushOwnerBullet1'), t('questionnaire.coach.pushOwnerBullet2'), t('questionnaire.coach.pushOwnerBullet3'), t('questionnaire.coach.pushOwnerBullet4')];

  const title = audience === 'athlete' ? t('questionnaire.athlete.pushTitle') : t('questionnaire.coach.pushTitle');
  const subtitle = audience === 'athlete' ? t('questionnaire.athlete.pushSubtitle') : t('questionnaire.coach.pushSubtitle');

  async function handleEnable() {
    if (!supported) { onDone(false); return; }
    setLoading(true);
    const result = await subscribe();
    setLoading(false);
    onDone(result === true);
  }

  return (
    <div>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Bell className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
      <p className="mb-6 text-muted-foreground">{subtitle}</p>

      <ul className="mb-6 space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleEnable}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t('questionnaire.common.enableNotifications')}
      </button>
      <button
        onClick={() => onDone(false)}
        disabled={loading}
        className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground min-h-[36px]"
      >
        {t('questionnaire.common.notNow')}
      </button>
    </div>
  );
}
