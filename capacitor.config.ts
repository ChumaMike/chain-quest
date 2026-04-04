import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chainquest.game',
  appName: 'Chain Quest',
  webDir: 'dist',
  // Capacitor will serve the built dist/ folder locally.
  // All API calls use VITE_API_URL (set in .env.production).
};

export default config;
