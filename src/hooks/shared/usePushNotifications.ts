import { useState, useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { pushRegistrationBus } from './useAutoRegisterPush';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

/** Resolves with the SW registration, or null after timeout. */
function swReadyWithTimeout(ms = 8000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(r => setTimeout(() => r(null), ms)),
  ]);
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const ok = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
    setSupported(ok);

    // Check if already subscribed — verify both browser AND database
    if (ok && Notification.permission === 'granted' && user) {
      swReadyWithTimeout().then(async (reg) => {
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        setSubscribed(true); // Assume good initially (prevents prompt flash)
        // Then verify it's actually in the DB
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
          .maybeSingle();
        if (!data) setSubscribed(false); // DB missing — re-show prompt
      }).catch(() => {});
    }

    // Listen for auto-register completing (fixes race with useAutoRegisterPush)
    const onRegistered = () => setSubscribed(true);
    pushRegistrationBus.addEventListener('registered', onRegistered);
    return () => pushRegistrationBus.removeEventListener('registered', onRegistered);
  }, [user]);

  const subscribe = useCallback(async (retry = true): Promise<true | string> => {
    if (!user) return i18n.t('errors.notSignedIn', { ns: 'common' });
    if (!supported) return i18n.t('notifications.unsupported', { ns: 'common' });

    try {
      // Request permission if not yet granted
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') return i18n.t('notifications.permissionDenied', { ns: 'common' });
      }

      const registration = await swReadyWithTimeout();
      if (!registration) {
        return i18n.t('notifications.failed', { ns: 'common' });
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const sub = subscription.toJSON();
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: sub.endpoint!,
          keys: sub.keys,
        }, { onConflict: 'user_id,endpoint' });

      if (error) {
        Sentry.captureMessage('Push subscription save failed on enable', {
          level: 'warning',
          extra: { error: error.message, userId: user.id },
        });
        return localizeErrorMessage(error, i18n.t('notifications.failed', { ns: 'common' }));
      }

      setSubscribed(true);
      return true;
    } catch (err: any) {
      // SW may have been evicted (common on iOS). Wait for re-registration and retry once.
      if (retry && String(err).toLowerCase().includes('service worker')) {
        await new Promise(r => setTimeout(r, 2500));
        return subscribe(false);
      }
      Sentry.captureException(err, { extra: { context: 'push subscribe', userId: user?.id } });
      return localizeErrorMessage(err, i18n.t('notifications.failed', { ns: 'common' }));
    }
  }, [user, supported]);

  return { supported, permission, subscribed, subscribe };
}
