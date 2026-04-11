import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
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
}));
