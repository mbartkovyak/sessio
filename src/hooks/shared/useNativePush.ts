import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n';
import { isNative, isIOS } from '@/lib/platform';
import { getDeviceId } from '@/lib/device-id';
import { invalidatePushTargets } from '@/lib/pushRefresh';
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
  const queryClient = useQueryClient();
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
            // Invalidate caches the notification likely points at. The
            // realtime WebSocket was disconnected while the app was
            // suspended, so the persisted query cache has no record of
            // whatever event triggered this push — and on cold start the
            // persisted cache can still look "fresh" (<5min staleTime).
            // Without this, the coach lands on a stale participant list
            // until the user pulls to refresh.
            invalidatePushTargets(queryClient);
            if (url) navigate(url);
          },
        );
        if (cancelled) {
          tapHandle.remove();
          return;
        }
        handlesRef.current.push(tapHandle);

        // Foreground pushes: iOS shows no banner (no presentationOptions —
        // changing that needs a store release) and Android suppresses
        // notification messages while the app is open. Refresh the affected
        // queries so on-screen lists update, and surface a toast so the
        // event is visible (e.g. a waitlisted athlete can claim a freed
        // spot before someone else does). Chat messages are skipped: the
        // global realtime channel already keeps them fresh, and a toast
        // would fire while the user may be inside that very chat.
        const fgHandle = await FirebaseMessaging.addListener(
          'notificationReceived',
          (e) => {
            const data = (e.notification?.data ?? {}) as Record<string, unknown>;
            const tag = typeof data.tag === 'string' ? data.tag : '';
            if (tag.startsWith('msg-')) return;
            invalidatePushTargets(queryClient);
            // Title/body arrive pre-localized per recipient (fcm.ts mirrors
            // them into data for the web SW path).
            const title = e.notification?.title ?? (typeof data.title === 'string' ? data.title : null);
            const body = e.notification?.body ?? (typeof data.body === 'string' ? data.body : '');
            const url = typeof data.url === 'string' ? data.url : null;
            if (title) {
              toast(title, {
                description: body,
                action: url
                  ? { label: i18n.t('profile.open', { ns: 'common' }), onClick: () => navigate(url) }
                  : undefined,
              });
            }
          },
        );
        if (cancelled) {
          fgHandle.remove();
          return;
        }
        handlesRef.current.push(fgHandle);

        // Now fetch the current token and upsert.
        // On iOS, APNS token may not be available yet right after permission
        // grant. Retry a few times with a short delay before giving up —
        // the tokenReceived listener above will catch it eventually.
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { token } = await FirebaseMessaging.getToken();
            if (token && !cancelled) await upsert(token);
            break;
          } catch (err) {
            if (attempt < 2 && isIOS) {
              await new Promise((r) => setTimeout(r, 1500));
            } else {
              throw err;
            }
          }
        }
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
