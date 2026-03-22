import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

/**
 * Call at app root. Ensures the browser's push subscription
 * is saved to Supabase whenever permission is granted.
 */
export function useAutoRegisterPush() {
  const { user } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !user || !VAPID_KEY) return;
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return;

    done.current = true;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
          });
        }
        const json = sub.toJSON();
        const { error } = await supabase.from('push_subscriptions').upsert(
          { user_id: user.id, endpoint: json.endpoint!, keys: json.keys },
          { onConflict: 'user_id,endpoint' }
        );
        if (error) {
          console.error('Push DB save failed:', error.message);
          // Retry without upsert — maybe the constraint doesn't exist yet
          const { error: insertErr } = await supabase.from('push_subscriptions').insert({
            user_id: user.id, endpoint: json.endpoint!, keys: json.keys,
          });
          if (insertErr) console.error('Push DB insert also failed:', insertErr.message);
        }
      } catch (e) {
        console.error('Auto push registration failed:', e);
      }
    })();
  }, [user]);
}
