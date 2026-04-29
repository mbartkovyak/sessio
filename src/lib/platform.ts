import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = !isNative;

// Native builds bake VITE_WEB_ORIGIN at build time so dev TestFlight / dev APK
// share links point at the dev web origin (which talks to the dev Supabase),
// while prod builds default to https://get-sessio.com.
const WEB_ORIGIN = (import.meta.env.VITE_WEB_ORIGIN as string | undefined)?.trim() || 'https://get-sessio.com';

/** Returns a web-accessible origin for shareable links (invite URLs, etc.) */
export function getShareableOrigin(): string {
  return isNative ? WEB_ORIGIN : window.location.origin;
}

/** Sniff the browser user-agent to pick which store/flow to offer on the landing page. Best-effort. */
export function detectBrowserPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
