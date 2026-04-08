import { App as CapApp } from '@capacitor/app';
import { isNative } from './platform';

/**
 * Listen for deep link opens (OAuth callback, invite links, etc.)
 * Must be called once at app startup, before React mounts.
 */
export function setupDeepLinks(): void {
  if (!isNative) return;

  CapApp.addListener('appUrlOpen', ({ url }) => {
    try {
      const parsed = new URL(url);
      // pathname from custom scheme: com.get-sessio.app://auth/callback → /auth/callback
      const path = parsed.pathname || parsed.host;

      if (path.includes('auth/callback')) {
        // OAuth callback — Supabase puts tokens in the hash fragment
        // Navigate the webview to /auth/callback with the hash
        const callbackUrl = `/auth/callback${parsed.hash || ''}${parsed.search || ''}`;
        window.location.replace(callbackUrl);
        return;
      }

      // Other deep links (invite links, etc.) — navigate to the path
      if (path && path !== '/') {
        window.location.replace(path + parsed.search + parsed.hash);
      }
    } catch (e) {
      console.error('Deep link parse error:', e);
    }
  });
}
