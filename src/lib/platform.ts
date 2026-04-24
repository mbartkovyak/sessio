import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = !isNative;

const WEB_ORIGIN = 'https://get-sessio.com';

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
