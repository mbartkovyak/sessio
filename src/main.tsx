import './i18n';
import * as Sentry from '@sentry/react';
import { createRoot } from "react-dom/client";
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import App from "./App.tsx";
import "./index.css";
import { setupDeepLinks } from './lib/deep-links';
import { isNative } from './lib/platform';

Sentry.init({
  dsn: "https://b0f77b62654df6d6961befbf75ae6c57@o4511111659388928.ingest.de.sentry.io/4511111675576400",
  sendDefaultPii: false,
  environment: import.meta.env.MODE,
});

setupDeepLinks();

createRoot(document.getElementById("root")!).render(<App />);

if (isNative) {
  // Auto-select Capgo channel based on build mode.
  // Dev builds (bun run build:dev) → 'dev' channel.
  // Prod builds (bun run build) → stays on defaultChannel 'production'.
  // This lets both "Sessio Dev" and "Sessio" coexist on the same phone,
  // each receiving OTA updates from the correct channel.
  if (import.meta.env.MODE === 'development') {
    CapacitorUpdater.setChannel({ channel: 'dev', triggerAutoUpdate: true }).catch(() => {});
  }

  // Signal that this bundle booted successfully so the plugin
  // doesn't roll back to the previous version.
  CapacitorUpdater.notifyAppReady().catch(err => {
    Sentry.captureException(err, { extra: { context: 'CapacitorUpdater.notifyAppReady' } });
  });
}
