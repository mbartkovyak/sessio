import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode, command }) => {
  // Build-time guard: prevent silently shipping a bundle without Supabase credentials.
  // This has happened before — missing .env produced a broken IPA that Apple rejected.
  // Skip during `vite dev` to avoid blocking local server startup; only guard `vite build`.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
    const missing = required.filter(k => !env[k]);
    if (missing.length > 0) {
      console.error('\n\x1b[31m✗ Build aborted: missing required env vars: ' + missing.join(', ') + '\x1b[0m');
      console.error('\x1b[33m  For prod builds, run: vercel env pull .env --environment=production');
      console.error('  For dev builds, ensure .env.development exists\x1b[0m\n');
      process.exit(1);
    }
  }
  return {
  server: {
    host: "localhost",
    port: 5173,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    // PWA: manifest + SW are static files in public/ (vite-plugin-pwa's SW build hangs under bun)
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (id.includes('date-fns')) return 'vendor-datefns';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('i18next')) return 'vendor-i18n';
            if (id.includes('@sentry')) return 'vendor-sentry';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub Firebase JS SDK messaging module — @capacitor-firebase/messaging
      // imports it in its web bundle as an optional peer dep, but we only
      // use the plugin on native. The stub satisfies Vite's static analysis
      // without pulling Firebase JS into the web bundle.
      "firebase/messaging": path.resolve(__dirname, "./src/lib/firebase-messaging-web-stub.ts"),
    },
  },
  };
});
