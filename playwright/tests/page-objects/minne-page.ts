import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { downloadImages, cleanupTempFiles } from '../shared/utils';

/**
 * Page Object for minne product creation form.
 */
export class MinnePage {
  readonly page: Page;

  // --- Login selectors ---
  readonly loginEmail: Locator;
  readonly loginSubmit: Locator;

  // --- Form selectors ---
  readonly titleInput: Locator;
  readonly categoryParentSelect: Locator;
  readonly categoryChildSelect: Locator;
  readonly descriptionTextarea: Locator;
  readonly priceInput: Locator;
  readonly stockInput: Locator;
  readonly shippingDaysInput: Locator;
  readonly imageFileInput: Locator;
  readonly shippingMethodSelect: Locator;
  readonly shippingAreaInput: Locator;
  readonly shippingFeeInput: Locator;
  readonly shippingAdditionalFeeInput: Locator;
  readonly submitButton: Locator;
  readonly flashSuccess: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login
    this.loginEmail = page.getByRole('textbox', { name: 'メールアドレス' });
    this.loginSubmit = page.getByRole('button', { name: 'ログインリンクを送信' });

    // Form fields
    this.titleInput = page.getByRole('textbox', { name: /作品名/ });
    this.categoryParentSelect = page.getByLabel('大カテゴリー');
    this.categoryChildSelect = page.getByLabel('小カテゴリー');
    this.descriptionTextarea = page.getByRole('textbox', { name: /作品説明/ });
    this.priceInput = page.getByRole('spinbutton', { name: /販売価格/ });
    this.stockInput = page.getByRole('spinbutton', { name: /在庫と単位/ });
    this.shippingDaysInput = page.getByRole('spinbutton', { name: /発送までの目安/ });
    this.imageFileInput = page.locator("input[type='file']").first();
    this.shippingMethodSelect = page.locator('#shipping-method-shipped-by-0');
    this.shippingAreaInput = page.locator('#shipping-method-shipped-to-0');
    this.shippingFeeInput = page.locator('#shipping-method-cost-0');
    this.shippingAdditionalFeeInput = page.locator('#shipping-method-additional-cost-0');
    this.submitButton = page.getByRole('button', { name: 'この内容で登録・更新する' });
    this.flashSuccess = page.locator('[class*="flash-message-success"]');
  }

  async sendLoginLink(email: string) {
    await this.page.goto('https://minne.com/users/sign_in', {
      waitUntil: 'domcontentloaded',
    });
    await this.loginEmail.fill(email);
    await this.loginSubmit.click();
  }

  async openLoginLink(loginUrl: string) {
    await this.page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  }

  async navigateToHome() {
    await this.page.goto('https://minne.com/account', {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.page).toHaveURL(/\/account/);
  }

  async navigateToNewProduct() {
    await this.page.goto('https://minne.com/account/products/new', {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.page).toHaveURL(/\/account\/products\/new/);
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async selectCategory(parentId: string | null, childId: string | null) {
    if (parentId) {
      await this.categoryParentSelect.selectOption(parentId).catch(() => {
        console.warn('[minne] 親カテゴリが選択できません', parentId);
      });
    }
    if (childId) {
      await this.categoryChildSelect
        .waitFor({ state: 'attached', timeout: 10_000 })
        .catch(() => {});
      if (await this.categoryChildSelect.isEnabled()) {
        await this.categoryChildSelect.selectOption(childId).catch(() => {
          console.warn('[minne] 子カテゴリが選択できません', childId);
        });
      }
    }
  }

  async fillDescription(description: string) {
    await this.descriptionTextarea.fill(description);
  }

  async fillPrice(price: string) {
    await this.priceInput.fill(price);
  }

  async fillStock(stock: string) {
    await this.stockInput.fill(stock);
  }

  async fillShippingDays(days: string) {
    await this.shippingDaysInput.fill(days);
  }

  async uploadImages(imageUrls: string[]): Promise<string[]> {
    const imageFiles = await downloadImages(imageUrls, 'minne-image');
    let filesToUpload = imageFiles;
    const fallback = path.resolve(process.cwd(), 'public/vercel.svg');
    if (!filesToUpload.length && fs.existsSync(fallback)) {
      filesToUpload = [fallback];
    }
    if (filesToUpload.length) {
      await this.imageFileInput
        .evaluate((node) => {
          if (node instanceof HTMLElement) {
            node.removeAttribute('hidden');
            node.style.display = 'block';
          }
        })
        .catch(() => {});
      await this.imageFileInput.setInputFiles(filesToUpload);
    }
    return imageFiles; // Caller is responsible for cleanup
  }

  async fillShipping(
    method: string | null,
    area: string | null,
    fee: string | null,
    additionalFee: string | null,
  ) {
    if (method) {
      await this.shippingMethodSelect.selectOption(method).catch(() => {
        console.warn('[minne] 配送方法を選択できません', method);
      });
    }
    if (area) await this.shippingAreaInput.fill(area);
    if (fee) await this.shippingFeeInput.fill(fee);
    if (additionalFee) await this.shippingAdditionalFeeInput.fill(additionalFee);
  }

  async submitForm() {
    await expect(this.submitButton).toBeVisible();
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await expect(this.flashSuccess).toContainText('作品', { timeout: 15_000 });
  }
}
