import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Loader2, Check } from 'lucide-react';
import { usePushNotifications } from '@/hooks/shared/usePushNotifications';
import { isNative } from '@/lib/platform';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  audience: 'athlete' | 'coach';
  coachTrack?: CoachTrack;
  onDone: (enabled: boolean) => void;
}

export default function QuestionnairePush({ audience, coachTrack, onDone }: Props) {
  const { t } = useTranslation('auth');
  const { supported, permission, subscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  // If web permission is already granted, surface that directly — tapping
  // "Enable" won't produce a system dialog and leaves the user confused.
  const alreadyGrantedWeb = !isNative && typeof Notification !== 'undefined' && permission === 'granted';

  const title = audience === 'athlete' ? t('questionnaire.athlete.pushTitle') : t('questionnaire.coach.pushTitle');
  const subtitle = audience === 'athlete' ? t('questionnaire.athlete.pushSubtitle') : t('questionnaire.coach.pushSubtitle');
  const ctaLabel = audience === 'athlete' ? t('questionnaire.athlete.pushCta') : t('questionnaire.common.enableNotifications');
  const bullets = audience === 'athlete'
    ? [t('questionnaire.athlete.pushBullet1'), t('questionnaire.athlete.pushBullet2'), t('questionnaire.athlete.pushBullet3')]
    : null;

  async function handleEnable() {
    setLoading(true);
    try {
      if (isNative) {
        // Native (iOS/Android) — FirebaseMessaging owns the system dialog.
        // useNativePush at app root will pick up the token once granted.
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const current = await FirebaseMessaging.checkPermissions();
        if (current.receive === 'granted') { onDone(true); return; }
        const result = await FirebaseMessaging.requestPermissions();
        onDone(result.receive === 'granted');
        return;
      }
      if (!supported) { onDone(false); return; }
      const result = await subscribe();
      onDone(result === true);
    } catch {
      onDone(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Bell className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-3 text-3xl font-bold text-foreground leading-tight">{title}</h1>
      <p className="mb-6 text-base text-muted-foreground leading-snug">{subtitle}</p>

      {bullets && (
        <ul className="mb-6 space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-base text-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      )}

      {alreadyGrantedWeb ? (
        <>
          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3.5 text-base font-medium text-success">
            <Check className="h-4 w-4" />
            {t('questionnaire.common.alreadyEnabled')}
          </div>
          <button
            onClick={() => onDone(true)}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground min-h-[48px]"
          >
            {t('questionnaire.common.continue')}
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground disabled:opacity-50 min-h-[48px]"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {ctaLabel}
          </button>
          <button
            onClick={() => onDone(false)}
            disabled={loading}
            className="mt-3 w-full text-base text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            {t('questionnaire.common.notNow')}
          </button>
        </>
      )}
    </div>
  );
}
