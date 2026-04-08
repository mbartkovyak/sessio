import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.get-sessio.app',
  appName: 'Sessio',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
