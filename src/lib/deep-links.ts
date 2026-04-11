import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isNative } from './platform';

/**
 * Listen for deep link opens (OAuth callback, invite links, etc.)
 * Must be called once at app startup, before React mounts.
 *
 * Note: we `removeAllListeners()` first because `window.location.replace()`
 * below reloads the webview after an OAuth callback. The new JS context then
 * runs main.tsx → setupDeepLinks() again; without the cleanup we'd accumulate
 * a dead listener from the previous context every reload, and on iOS that can
 * short-circuit delivery of subsequent deep links (the app would appear
 * stuck on the Google OAuth page while the session silently lands).
 */
export function setupDeepLinks(): void {
  if (!isNative) return;

  CapApp.removeAllListeners().finally(() => {
    CapApp.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        // For custom schemes, URL parses com.get-sessio.app://auth/callback as
        // host="auth", pathname="/callback". Combine them to get the full path.
        const path = `/${parsed.host}${parsed.pathname}`.replace(/\/+$/, '') || '/';

        if (path.startsWith('/auth/callback')) {
          // OAuth callback — Supabase puts tokens in the hash fragment.
          // Dismiss the in-app browser (SFSafariViewController) so the user
          // returns to the webview, then route to /auth/callback.
          Browser.close().catch(() => {});
          window.location.replace(`/auth/callback${parsed.search}${parsed.hash}`);
          return;
        }

        // Other deep links (invite links, etc.) — navigate to the path
        if (path !== '/') {
          window.location.replace(path + parsed.search + parsed.hash);
        }
      } catch (e) {
        console.error('Deep link parse error:', e);
      }
    });
  });
}
