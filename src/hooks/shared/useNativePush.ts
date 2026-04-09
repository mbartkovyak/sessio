import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isNative, isIOS } from '@/lib/platform';
import { getDeviceId } from '@/lib/device-id';
// FirebaseMessaging is loaded dynamically inside the effect to avoid a
// startup deadlock on iOS — the plugin's JS bridge synchronizes with
// native method swizzling during import, blocking React from rendering
// if imported at module level.

/**
 * Native push registration via Firebase Cloud Messaging (iOS + Android).
 *
 * Sibling to useAutoRegisterPush (web/VAPID). The `isNative` early-return
 * in both hooks means exactly one path runs on any given device — no
 * overlap, no duplicate notifications.
 *
 * Lifecycle notes:
 *
 * - Effect depends on `user?.id` (primitive), not the `user` object, so
 *   auth/profile refreshes don't tear down and re-attach listeners.
 *
 * - Listeners go into `handlesRef` and are ALWAYS removed in both effect
 *   cleanup and the `!user` branch. No path leaks a handle.
 *
 * - `lastTokenRef` dedupes the upsert when `tokenReceived` fires with the
 *   same token that `getToken()` already returned (StrictMode double-mount
 *   or Firebase's normal behavior on cold start).
 *
 * - Listeners are attached BEFORE `getToken()` so a mid-registration
 *   rotation event isn't lost.
 *
 * - `cancelled` guards the async work so we never upsert for a user who's
 *   already signed out.
 */
export function useNativePush() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handlesRef = useRef<PluginListenerHandle[]>([]);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNative) return;

    const teardown = () => {
      handlesRef.current.forEach((h) => h.remove());
      handlesRef.current = [];
    };

    if (!user) {
      lastTokenRef.current = null;
      teardown();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import to avoid iOS startup deadlock — the plugin's JS
        // bridge synchronizes with native method swizzling on import.
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

        // Only prompt if not already granted. Avoids the iOS system
        // permission sheet flashing on every cold start after the user
        // already answered.
        const current = await FirebaseMessaging.checkPermissions();
        const granted =
          current.receive === 'granted'
            ? true
            : (await FirebaseMessaging.requestPermissions()).receive === 'granted';
        if (!granted || cancelled) return;

        const deviceId = await getDeviceId();
        const platform: 'ios' | 'android' = isIOS ? 'ios' : 'android';

        // Upsert (+ ownership move) for one token.
        const upsert = async (token: string) => {
          if (lastTokenRef.current === token) return;
          lastTokenRef.current = token;

          // Move ownership: any other user with this exact token loses it.
          // Keyed on (transport, target) = ('fcm', token) — a real global
          // identifier for this device.
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('transport', 'fcm')
            .eq('target', token)
            .neq('user_id', user.id);

          const { error } = await supabase.from('push_subscriptions').upsert(
            {
              user_id: user.id,
              device_id: deviceId,
              platform,
              transport: 'fcm',
              target: token,
              web_keys: null,
              updated_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,device_id' },
          );
          if (error) {
            Sentry.captureMessage('native push upsert failed', {
              level: 'warning',
              extra: { error: error.message, userId: user.id, platform },
            });
          }
        };

        // Attach listeners FIRST so a tokenReceived event during getToken()
        // isn't missed. Push into handlesRef immediately after each await
        // so cleanup can remove them even if we unmount mid-registration.
        const tokenHandle = await FirebaseMessaging.addListener(
          'tokenReceived',
          (e) => {
            void upsert(e.token);
          },
        );
        if (cancelled) {
          tokenHandle.remove();
          return;
        }
        handlesRef.current.push(tokenHandle);

        const tapHandle = await FirebaseMessaging.addListener(
          'notificationActionPerformed',
          (e) => {
            const data = (e.notification?.data ?? {}) as Record<string, unknown>;
            const url = typeof data.url === 'string' ? data.url : null;
            if (url) navigate(url);
          },
        );
        if (cancelled) {
          tapHandle.remove();
          return;
        }
        handlesRef.current.push(tapHandle);

        // Now fetch the current token and upsert.
        const { token } = await FirebaseMessaging.getToken();
        if (token && !cancelled) await upsert(token);
      } catch (e) {
        Sentry.captureException(e, {
          extra: { context: 'native push register', userId: user?.id },
        });
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [user?.id, navigate]);
}
