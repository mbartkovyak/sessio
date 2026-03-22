import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

async function registerSubscription(userId: string): Promise<boolean> {
  try {
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
        user_id: userId,
        endpoint: sub.endpoint!,
        keys: sub.keys,
      }, { onConflict: 'user_id,endpoint' });

    if (error) console.error('Failed to save push subscription:', error);
    return !error;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [supported, setSupported] = useState(false);
  const autoRegistered = useRef(false);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY);
  }, []);

  // Auto-register subscription if permission is already granted (e.g. user granted via iOS dialog but subscription wasn't saved)
  useEffect(() => {
    if (!user || !supported || autoRegistered.current) return;
    if (Notification.permission === 'granted') {
      autoRegistered.current = true;
      registerSubscription(user.id);
    }
  }, [user, supported]);

  const subscribe = useCallback(async () => {
    if (!user || !supported) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;
      return await registerSubscription(user.id);
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    }
  }, [user, supported]);

  return { supported, permission, subscribe };
}
