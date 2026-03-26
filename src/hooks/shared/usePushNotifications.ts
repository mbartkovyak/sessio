import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
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

    // Check if already subscribed
    if (ok && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setSubscribed(true);
        })
      ).catch(() => {});
    }
  }, []);

  const subscribe = useCallback(async (): Promise<true | string> => {
    if (!user) return i18n.t('errors.notSignedIn', { ns: 'common' });
    if (!supported) return i18n.t('notifications.unsupported', { ns: 'common' });

    try {
      // Request permission if not yet granted
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') return i18n.t('notifications.permissionDenied', { ns: 'common' });
      }

      const registration = await navigator.serviceWorker.ready;

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

      if (error) return localizeErrorMessage(error, i18n.t('notifications.failed', { ns: 'common' }));

      setSubscribed(true);
      return true;
    } catch (err: any) {
      return localizeErrorMessage(err, i18n.t('notifications.failed', { ns: 'common' }));
    }
  }, [user, supported]);

  return { supported, permission, subscribed, subscribe };
}
