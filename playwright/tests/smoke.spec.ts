import { expect, test } from '@playwright/test';

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

test.describe('App smoke test', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByLabel('メールアドレス')).toBeVisible();
    await expect(page.getByLabel('パスワード')).toBeVisible();
  });

  test('dashboard shows mock sheet data after login', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'ADMIN_EMAIL / ADMIN_PASSWORD must be configured');

    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(adminEmail!);
    await page.getByLabel('パスワード').fill(adminPassword!);
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 30_000 }),
      page.getByRole('button', { name: 'ログイン' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    await expect(page.getByText('Creema向けリング').first()).toBeVisible();
    await expect(page.getByText('Minne向けピアス').first()).toBeVisible();
  });
});
