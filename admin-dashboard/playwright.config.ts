import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5174';
const localAnonKey = `eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.${'x'.repeat(64)}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: localAnonKey,
      SITE_URL: baseURL,
      NEXT_PUBLIC_ENVIRONMENT_LABEL: 'LOCAL MOCK',
    },
  },
});
