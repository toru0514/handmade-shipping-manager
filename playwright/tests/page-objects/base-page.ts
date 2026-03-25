import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { downloadImages, cleanupTempFiles } from '../shared/utils';

/**
 * Page Object for BASE product creation form.
 */
export class BasePage {
  readonly page: Page;
  readonly baseOrigin: string;

  // --- Login selectors ---
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  // --- Form selectors ---
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly priceInput: Locator;
  readonly stockInput: Locator;
  readonly imageFileInput: Locator;

  // --- Publish radio buttons (公開/非公開) ---
  readonly publishInput: Locator;
  readonly unpublishRadio: Locator;

  // --- Navigation ---
  readonly registerButton: Locator;

  constructor(page: Page, baseOrigin = 'https://admin.thebase.com') {
    this.page = page;
    this.baseOrigin = baseOrigin;

    // Login - multiple selector fallbacks for resilience
    this.emailInput = page
      .locator("input[type='email'], input[name='email'], input#user_email")
      .first();
    this.passwordInput = page
      .locator("input[type='password'], input[name='password'], input#user_password")
      .first();

    // Form fields
    this.titleInput = page.getByRole('textbox', { name: '商品名' });
    this.descriptionInput = page.getByRole('textbox', { name: '商品説明' });
    this.priceInput = page.getByRole('textbox', { name: /価格/ });
    this.stockInput = page.getByRole('textbox', { name: /在庫/ });
    this.imageFileInput = page.locator("input.m-uploadBox__input[type='file']");

    // Publish radio buttons (公開状態: 公開 / 非公開)
    this.publishInput = page.getByRole('radio', { name: '公開', exact: true });
    this.unpublishRadio = page.getByRole('radio', { name: '非公開' });

    // Navigation
    this.registerButton = page.getByRole('button', { name: /商品を登録/i }).first();
  }

  /** Navigate to login page. Returns true if already logged in (redirected to dashboard). */
  async navigateToLogin(): Promise<boolean> {
    await this.page.goto(`${this.baseOrigin}/users/login`, {
      waitUntil: 'load',
    });
    // Already logged in — redirected to dashboard
    if (/\/(dashboard|shop_admin)/.test(this.page.url())) {
      return true;
    }
    await expect(this.page).toHaveURL(/\/users\/login/);
    await expect(this.page.locator('form')).toBeVisible();
    return false;
  }

  async fillCredentials(email: string, password: string) {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async waitForManualLogin() {
    // User must manually click login button and complete 2FA
    await this.page.pause();
  }

  async navigateToItemsList() {
    await this.page.goto(`${this.baseOrigin}/shop_admin/items/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.page).toHaveURL(/\/shop_admin\/items\//);
    await expect(this.page.getByRole('button', { name: /商品を登録する/i })).toBeVisible();
  }

  async navigateToAddItem() {
    await this.page.getByRole('button', { name: /商品を登録する/i }).click();
    await this.page.waitForURL(/\/shop_admin\/items\/add/, {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.page).toHaveURL(/\/shop_admin\/items\/add/);
    await expect(this.page.locator('body')).toContainText(/商品登録/i);
  }

  async uncheckPublish() {
    try {
      await this.unpublishRadio.waitFor({ state: 'attached', timeout: 5000 });
      if (!(await this.unpublishRadio.isChecked())) {
        await this.unpublishRadio.check({ force: true });
      }
    } catch {
      console.warn('[base] 公開設定のラジオボタンを操作できませんでした');
    }
  }

  async fillProductForm(title: string, description: string, price: string, stock: string) {
    await this.titleInput.fill(title);
    await this.descriptionInput.fill(description);
    await this.priceInput.fill(price);
    await this.stockInput.fill(stock);
  }

  async uploadImages(imageUrls: string[]): Promise<string[]> {
    const tempFiles = await downloadImages(imageUrls, 'base-image');
    let imageFiles = tempFiles;
    const fallback = path.resolve(process.cwd(), 'public/vercel.svg');
    if (!imageFiles.length && fs.existsSync(fallback)) {
      imageFiles = [fallback];
    }
    if (imageFiles.length) {
      await this.imageFileInput.setInputFiles(imageFiles);
    }
    return tempFiles; // Caller is responsible for cleanup
  }

  async selectCategory(categoryLabel: string | null): Promise<boolean> {
    if (!categoryLabel) return false;
    const categorySelect = this.page
      .locator('select')
      .filter({ has: this.page.locator(`option:has-text("${categoryLabel}")`) })
      .first();
    if ((await categorySelect.count()) === 0) {
      console.warn('[base] category select not found for', categoryLabel);
      return false;
    }
    try {
      await categorySelect.selectOption({ label: categoryLabel });
      return true;
    } catch {
      console.warn('[base] category option not selectable', categoryLabel);
      return false;
    }
  }

  async fillShippingMethod(method: string | null): Promise<boolean> {
    if (!method) return false;
    const shippingSelect = this.page
      .locator('select')
      .filter({ has: this.page.locator("option:has-text('宅配便')") })
      .first();
    if ((await shippingSelect.count()) === 0) {
      console.warn('[base] shipping method select not found');
      return false;
    }
    try {
      await shippingSelect.selectOption({ label: method });
      return true;
    } catch {
      console.warn('[base] shipping method not selectable', method);
      return false;
    }
  }

  async submitForm() {
    await Promise.all([this.page.waitForLoadState('networkidle'), this.registerButton.click()]);
  }
}
