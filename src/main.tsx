import './i18n';
import * as Sentry from '@sentry/react';
import { createRoot } from "react-dom/client";
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import App from "./App.tsx";
import "./index.css";
import { setupDeepLinks } from './lib/deep-links';
import { isNative, isAndroid } from './lib/platform';

Sentry.init({
  dsn: "https://b0f77b62654df6d6961befbf75ae6c57@o4511111659388928.ingest.de.sentry.io/4511111675576400",
  sendDefaultPii: false,
  environment: import.meta.env.MODE,
});

Sentry.addBreadcrumb({ category: 'boot', message: 'main:start' });

setupDeepLinks();

// Android 15+ enforces edge-to-edge display: the WebView draws full-screen
// under the status bar and system nav. Without explicit inset values, fixed
// elements like the bottom nav overlap the gesture indicator / nav buttons.
// We expose `--safe-area-inset-top/bottom` CSS variables immediately on boot
// so every fixed-position element has a reasonable clearance from first paint.
//
// The values are generous defaults that clear both 3-button nav (48dp) and
// gesture nav (~24dp) on nearly every Android device. MainActivity.java can
// refine these with per-device measurements if its WindowInsets listener
// fires, but this script runs synchronously before React mounts so we're
// never left with a 0px inset on first paint. iOS is untouched — iOS uses
// WKWebView's native `env(safe-area-inset-*)` (and the var defaults to
// `env()` in the CSS cascade via `var(--x, env(x, fallback))`).
if (isAndroid) {
  const html = document.documentElement.style;
  // Only set defaults if MainActivity.java's WindowInsets listener hasn't
  // already injected per-device values. MainActivity may refine these later
  // (when its listener fires post-layout); this script guarantees a sane
  // value is set synchronously before React mounts.
  if (!html.getPropertyValue('--safe-area-inset-bottom')) {
    html.setProperty('--safe-area-inset-top', '24px');
    html.setProperty('--safe-area-inset-bottom', '48px');
    html.setProperty('--safe-area-inset-left', '0px');
    html.setProperty('--safe-area-inset-right', '0px');
  }
}

createRoot(document.getElementById("root")!).render(<App />);
Sentry.addBreadcrumb({ category: 'boot', message: 'main:react-mounted' });

if (isNative) {
  // Auto-select Capgo channel based on build mode.
  // Guard with localStorage to avoid hitting Capgo's rate limit on every app boot.
  if (import.meta.env.MODE === 'development') {
    const channelKey = '_capgo_channel';
    if (localStorage.getItem(channelKey) !== 'dev') {
      CapacitorUpdater.setChannel({ channel: 'dev', triggerAutoUpdate: true })
        .then(() => localStorage.setItem(channelKey, 'dev'))
        .catch(err => {
          console.error('[Capgo] setChannel failed:', err);
        });
    }
  }

  // Signal that this bundle booted successfully so the plugin
  // doesn't roll back to the previous version.
  CapacitorUpdater.notifyAppReady().catch(err => {
    Sentry.captureException(err, { extra: { context: 'CapacitorUpdater.notifyAppReady' } });
  });
}
