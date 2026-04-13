import type { CapacitorConfig } from '@capacitor/cli';

// CAPGO_CHANNEL is set by android:dev / ios:dev scripts to 'dev'.
// Production builds leave it unset → defaults to 'production'.
// This bakes the channel into capacitor.config.json at sync time,
// so the Capgo plugin uses the correct channel without needing
// a setChannel() API call (which can fail silently).
const capgoChannel = process.env.CAPGO_CHANNEL || 'production';

const config: CapacitorConfig = {
  appId: 'com.get-sessio.app',
  appName: 'Sessio',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
      defaultChannel: capgoChannel,
      appId: 'com.get-sessio.app',
      version: '1.2.0',
    },
  },
};

export default config;
