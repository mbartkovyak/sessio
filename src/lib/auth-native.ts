import { Browser } from '@capacitor/browser';
import { isNative } from './platform';

const NATIVE_REDIRECT = 'com.get-sessio.app://auth/callback';
const WEB_ORIGIN = 'https://get-sessio.com';

/** OAuth redirect URL — custom scheme on native, current origin on web */
export function getAuthRedirectUrl(): string {
  return isNative ? NATIVE_REDIRECT : `${window.location.origin}/auth/callback`;
}

/** Email magic link redirect — always a real web URL (user clicks in email browser) */
export function getEmailRedirectUrl(): string {
  return isNative ? `${WEB_ORIGIN}/auth/callback` : `${window.location.origin}/auth/callback`;
}

/** Whether OAuth should open in an external browser (native or standalone PWA) */
export function shouldOpenExternalAuth(): boolean {
  return isNative || window.matchMedia('(display-mode: standalone)').matches;
}

/** Open a URL in the system browser (native) or new tab (standalone PWA) */
export async function openExternalAuth(url: string): Promise<void> {
  if (isNative) {
    await Browser.open({ url });
  } else {
    localStorage.setItem('sessio_oauth_pwa', '1');
    window.open(url, '_blank');
  }
}
