import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isNative } from '@/lib/platform';
import { getDeviceId } from '@/lib/device-id';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_STORAGE_KEY = '_vapidKey';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

/**
 * Ensure the SW is registered (registerSW.js fires on window.load which may
 * not have happened yet), then wait for it to activate.
 */
async function ensureSwReady(timeoutMs = 20000): Promise<ServiceWorkerRegistration | null> {
  // If no controller and no installing SW, kick off registration ourselves
  if (!navigator.serviceWorker.controller) {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch { /* registerSW.js will retry on load */ }
  }
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
  ]);
}

/** Event target so usePushNotifications can listen for auto-register completion. */
export const pushRegistrationBus = new EventTarget();

/**
 * Call at app root. Ensures the browser's push subscription
 * is saved to Supabase whenever permission is granted.
 * Handles VAPID key rotation: if the key changed, unsubscribes
 * the old subscription and creates a new one.
 */
export function useAutoRegisterPush() {
  const { user } = useAuth();
  // Tracks the user ID this hook has already registered for. Reset on sign-out
  // so the next sign-in on the same device re-subscribes (signOut now
  // unsubscribes the browser PushSubscription, so we must not skip).
  const registeredForUserId = useRef<string | null>(null);

  // Always tell the SW who the current user is (SW can restart and lose state)
  useEffect(() => {
    if (isNative || !user || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: 'SET_USER_ID', userId: user.id });
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      registeredForUserId.current = null;
      return;
    }
    if (isNative || !VAPID_KEY) return;
    if (registeredForUserId.current === user.id) return;
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return;

    registeredForUserId.current = user.id;

    (async () => {
      try {
        const reg = await ensureSwReady();
        if (!reg) return; // SW not available — prompt will handle manual retry
        let sub = await reg.pushManager.getSubscription();

        // If VAPID key changed, unsubscribe old and force re-subscribe
        const prevKey = localStorage.getItem(VAPID_STORAGE_KEY);
        if (sub && prevKey && prevKey !== VAPID_KEY) {
          await sub.unsubscribe();
          sub = null;
        }

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
          });
        }

        localStorage.setItem(VAPID_STORAGE_KEY, VAPID_KEY);

        const json = sub.toJSON();
        const deviceId = await getDeviceId();
        const now = new Date().toISOString();

        // One target = one device. Delete stale subscriptions from other
        // accounts that were previously signed in on this same browser.
        // Keyed on (transport, target) — globally unique per device.
        await supabase.from('push_subscriptions')
          .delete()
          .eq('transport', 'webpush')
          .eq('target', json.endpoint!)
          .neq('user_id', user.id);

        const row = {
          user_id: user.id,
          device_id: deviceId,
          platform: 'web' as const,
          transport: 'webpush' as const,
          target: json.endpoint!,
          web_keys: json.keys as { p256dh: string; auth: string },
          updated_at: now,
          last_seen_at: now,
        };

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(row, { onConflict: 'user_id,device_id' });
        if (error) {
          const { error: insertErr } = await supabase
            .from('push_subscriptions')
            .insert(row);
          if (insertErr) {
            Sentry.captureMessage('Push subscription DB save failed', {
              level: 'warning',
              extra: { upsertError: error.message, insertError: insertErr.message, userId: user.id },
            });
            return;
          }
        }
        // Notify subscribers that registration completed successfully
        pushRegistrationBus.dispatchEvent(new Event('registered'));
      } catch (e) {
        Sentry.captureException(e, { extra: { context: 'auto push registration', userId: user?.id } });
      }
    })();
  }, [user]);
}
