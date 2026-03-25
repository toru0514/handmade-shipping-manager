import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { downloadImages, cleanupTempFiles } from '../shared/utils';

/**
 * Page Object for iichi product creation form.
 */
export class IichiPage {
  readonly page: Page;
  private static readonly ROOT_URL = 'https://www.iichi.com';

  // --- Login selectors ---
  readonly loginLink: Locator;
  readonly loginEmail: Locator;
  readonly loginPassword: Locator;
  readonly loginContainer: Locator;
  readonly loginSubmitButton: Locator;

  // --- Form selectors ---
  readonly titleInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly priceInput: Locator;
  readonly stockInput: Locator;
  readonly imageFileInput: Locator;
  readonly saveButton: Locator;

  readonly successPopupTitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login
    this.loginLink = page.locator("a[href='/signin']").first();
    this.loginEmail = page.locator("input[name='email']");
    this.loginPassword = page.locator("input[name='password']");
    this.loginContainer = page
      .locator('form')
      .filter({ has: page.locator("input[name='email']") })
      .first();
    this.loginSubmitButton = page.locator("button[type='submit'], input[type='submit']").first();

    // Form fields
    this.titleInput = page.locator("input[name='title']");
    this.descriptionTextarea = page.locator("textarea[name='description']");
    this.priceInput = page.locator("input[name='price']");
    this.stockInput = page.locator("input[name='stock']");
    this.imageFileInput = page.locator("input[type='file'][accept*='image']").first();
    this.saveButton = page.getByRole('button', { name: /保存/ }).first();

    // Success indicator
    this.successPopupTitle = page.getByText(/保存されました/);
  }

  async navigateToLogin() {
    await this.page.goto(IichiPage.ROOT_URL, {
      waitUntil: 'domcontentloaded',
    });
    await this.loginLink.click();
    const loginFormVisible = await this.loginContainer
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!loginFormVisible) {
      await this.page.goto(`${IichiPage.ROOT_URL}/signin`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(this.loginEmail).toBeVisible();
    }
  }

  async login(email: string, password: string) {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);

    const buttonByRole = this.page
      .getByRole('button', { name: /ログイン/ })
      .filter({ hasText: /ログインする|ログイン/i })
      .first();
    if ((await buttonByRole.count()) > 0) {
      await buttonByRole.click();
    } else {
      await this.loginSubmitButton.click();
    }

    await this.loginContainer.waitFor({ state: 'detached', timeout: 10_000 }).catch(async () => {
      console.warn('[iichi] login form still visible; waiting for manual login');
      await this.page.pause();
    });
  }

  async navigateToNewItem() {
    await this.page.goto(`${IichiPage.ROOT_URL}/account`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.page).toHaveURL(/\/account/);
    await this.page.goto(`${IichiPage.ROOT_URL}/your/item/create`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.page).toHaveURL(/\/your\/item\/create/);
  }

  async fillProductForm(title: string, description: string, price: string, stock: string) {
    await this.titleInput.fill(title);
    await this.descriptionTextarea.fill(description);
    await this.priceInput.fill(price);
    await this.stockInput.fill(stock);
  }

  async selectDropdownByLabel(
    labelText: string,
    optionText: string | null,
    occurrence = 0,
  ): Promise<boolean> {
    if (!optionText) return false;
    const formItems = this.page.locator('.el-form-item').filter({
      has: this.page.locator(`.el-form-item__label:has-text("${labelText}")`),
    });
    const count = await formItems.count();
    if (!count) return false;
    const target = formItems.nth(Math.min(occurrence, count - 1));
    const selectWrapper = target.locator('.el-select__wrapper').first();
    const visibleDropdowns = this.page.locator('.el-select-dropdown:visible');
    const dropdownBefore = await visibleDropdowns.count();
    await selectWrapper.click();
    await this.page.waitForTimeout(200);
    let dropdown = this.page.locator('.el-select-dropdown:visible').nth(dropdownBefore);
    if ((await dropdown.count()) === 0) {
      dropdown = this.page.locator('.el-select-dropdown:visible').last();
    }
    const option = dropdown
      .locator('.el-select-dropdown__item')
      .filter({ hasText: optionText.trim() })
      .first();
    try {
      await option.waitFor({ timeout: 10_000 });
      await option.click();
      return true;
    } catch (error) {
      console.warn('[iichi] select option not found', labelText, optionText, error);
      await this.page.keyboard.press('Escape').catch(() => {});
      return false;
    }
  }

  async uploadImages(imageUrls: string[]): Promise<string[]> {
    const tempFiles = await downloadImages(imageUrls, 'iichi-image');
    let filesToUpload = tempFiles;
    const fallback = path.resolve(process.cwd(), 'public/vercel.svg');
    if (!filesToUpload.length && fs.existsSync(fallback)) {
      filesToUpload = [fallback];
    }
    if (filesToUpload.length) {
      await expect(this.imageFileInput).toBeAttached();
      await this.imageFileInput.setInputFiles(filesToUpload);
    }
    return tempFiles;
  }

  async saveAndVerify() {
    await expect(this.saveButton).toBeVisible();
    await this.saveButton.click();
    await expect(this.successPopupTitle).toHaveText(/保存されました/, {
      timeout: 15_000,
    });
  }
}
