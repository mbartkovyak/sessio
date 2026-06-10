import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isNative } from '@/lib/platform';
import { getDeviceId } from '@/lib/device-id';
import { invalidatePushTargets } from '@/lib/pushRefresh';

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
  const queryClient = useQueryClient();
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

  // The SW relays incoming pushes to open pages (PUSH_RECEIVED). Refresh the
  // queries the push made stale — pages don't receive 'push' events directly.
  // Chat messages are skipped: the global realtime channel keeps them fresh.
  // No toast here — the SW already shows the OS notification even when the
  // page is focused (unlike native foreground).
  useEffect(() => {
    if (isNative || !user || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'PUSH_RECEIVED') return;
      const tag = typeof event.data.payload?.tag === 'string' ? event.data.payload.tag : '';
      if (tag.startsWith('msg-')) return;
      invalidatePushTargets(queryClient);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [user?.id, queryClient]);

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

        // One endpoint = one device. Delete ANY existing row with this
        // (transport, target) before upserting. Covers both:
        // - stale rows from other users who were signed in on this browser
        // - same user with a changed device_id (cleared storage)
        // Without this, the upsert on (user_id, device_id) can violate
        // the (transport, target) unique constraint.
        await supabase.from('push_subscriptions')
          .delete()
          .eq('transport', 'webpush')
          .eq('target', json.endpoint!);

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
