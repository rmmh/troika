import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/ui',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8000',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node build.mjs --serve',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
