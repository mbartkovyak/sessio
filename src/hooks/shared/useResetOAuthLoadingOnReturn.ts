import { useEffect } from 'react';
import { isNative } from '@/lib/platform';

/**
 * Reset OAuth loading state when the user returns to the app without
 * completing auth (e.g. pressed back in the external browser, dismissed
 * the iOS sheet, or cancelled the Android credential picker).
 *
 * Handles three cases:
 * - Web: visibilitychange when the OAuth tab closes
 * - Native iOS: Capacitor Browser's `browserFinished` event when the
 *   in-app browser is dismissed
 * - PWA standalone (display-mode: standalone): same visibilitychange path
 *
 * 1s delay lets a successful auth callback land first — otherwise we'd
 * race the callback's session restore and reset the spinner before the
 * user sees the success state.
 */
export function useResetOAuthLoadingOnReturn(active: boolean, reset: () => void) {
  useEffect(() => {
    if (!active) return;

    let timeout: ReturnType<typeof setTimeout>;
    const triggerReset = () => {
      timeout = setTimeout(reset, 1000);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') triggerReset();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let browserListener: { remove: () => void } | undefined;
    if (isNative) {
      import('@capacitor/browser').then(({ Browser }) => {
        Browser.addListener('browserFinished', triggerReset).then(l => { browserListener = l; });
      });
    }

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibility);
      browserListener?.remove();
    };
  }, [active, reset]);
}
