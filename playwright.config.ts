import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const creemaBaseUrl = process.env.CREEMA_BASE_URL ?? 'https://www.creema.jp';
const baseBaseUrl = process.env.BASE_BASE_URL ?? 'https://admin.thebase.com';

const sharedBrowserOptions = {
  ...devices['Desktop Chrome'],
  trace: 'on-first-retry' as const,
  video: 'retain-on-failure' as const,
  screenshot: 'only-on-failure' as const,
};

export default defineConfig({
  testDir: 'playwright/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 1000 * 60 * 5,
  expect: {
    timeout: 10_000,
  },
  projects: [
    {
      name: 'creema-chromium',
      testMatch: [/creema-draft\.spec\.ts/, /selector-health\.spec\.ts/],
      use: {
        ...sharedBrowserOptions,
        baseURL: creemaBaseUrl,
        storageState: process.env.PLAYWRIGHT_CREEMA_STORAGE
          ? 'playwright/.auth/creema-auth.json'
          : undefined,
      },
    },
    {
      name: 'minne-chromium',
      testMatch: [/minne-draft\.spec\.ts/, /selector-health\.spec\.ts/],
      use: {
        ...sharedBrowserOptions,
        baseURL: 'https://minne.com',
        storageState: process.env.PLAYWRIGHT_MINNE_STORAGE
          ? 'playwright/.auth/minne-auth.json'
          : undefined,
      },
    },
    {
      name: 'base-chromium',
      testMatch: [/base-draft\.spec\.ts/, /selector-health\.spec\.ts/],
      use: {
        ...sharedBrowserOptions,
        baseURL: baseBaseUrl,
        storageState: process.env.PLAYWRIGHT_BASE_STORAGE
          ? 'playwright/.auth/base-auth.json'
          : undefined,
      },
    },
    {
      name: 'iichi-chromium',
      testMatch: [/iichi-draft\.spec\.ts/, /selector-health\.spec\.ts/],
      use: {
        ...sharedBrowserOptions,
        baseURL: 'https://www.iichi.com',
        storageState: process.env.PLAYWRIGHT_IICHI_STORAGE
          ? 'playwright/.auth/iichi-auth.json'
          : undefined,
      },
    },
  ],
  outputDir: 'playwright/artifacts',
});
