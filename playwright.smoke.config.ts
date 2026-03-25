import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const smokePort = Number(process.env.SMOKE_WEB_PORT ?? 3100);
const smokeBaseUrl = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${smokePort}`;

export default defineConfig({
  testDir: 'playwright/tests',
  testMatch: /smoke\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 1000 * 60 * 2,
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: smokeBaseUrl,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${smokePort}`,
    url: smokeBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      USE_MOCK_SHEETS_DATA: 'true',
    },
  },
  outputDir: 'playwright/artifacts-smoke',
});
