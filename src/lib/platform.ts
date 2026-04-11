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
