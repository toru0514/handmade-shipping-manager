import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { downloadImages, cleanupTempFiles } from '../shared/utils';

/**
 * Page Object for Creema product creation form.
 */
export class CreemaPage {
  readonly page: Page;

  // --- Login selectors ---
  readonly loginEmail: Locator;
  readonly loginPassword: Locator;
  readonly loginSubmit: Locator;

  // --- Form selectors ---
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly priceInput: Locator;
  readonly stockSelect: Locator;
  readonly materialSelect: Locator;
  readonly imageFileInput: Locator;
  readonly shippingOriginSelect: Locator;
  readonly shippingMethodSelect: Locator;
  readonly craftPeriodSelect: Locator;
  readonly sizeTextarea: Locator;
  readonly categoryLevel1Select: Locator;
  readonly categoryLevel2Select: Locator;
  readonly categoryLevel3Select: Locator;
  readonly colorCheckboxes: string; // Used with dynamic values
  readonly tagHiddenInput: Locator;

  // --- Navigation selectors ---
  readonly nextStepButton: Locator;
  readonly confirmButton: Locator;
  readonly saveDraftButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login
    this.loginEmail = page.locator("input[name='email']");
    this.loginPassword = page.locator("input[name='password']");
    this.loginSubmit = page.locator('input.js-user-login-button');

    // Form fields
    this.titleInput = page.getByRole('textbox', { name: /作品タイトル/ });
    this.descriptionInput = page.getByRole('textbox', { name: /作品紹介文/ });
    this.priceInput = page.getByRole('textbox', { name: /価格/ });
    this.stockSelect = page.locator('select.js-attach-stock');
    this.materialSelect = page.locator('#form-item-material-id');
    this.imageFileInput = page.locator('input.js-file-upload');
    this.shippingOriginSelect = page.locator("select[name='item[delivery_from_prefecture_id]']");
    this.shippingMethodSelect = page.locator("select[name='item[shipping_methods][]']");
    this.craftPeriodSelect = page.locator("select[name='item[craft_period]']");
    this.sizeTextarea = page.getByRole('textbox', { name: /500文字以内/ });
    this.categoryLevel1Select = page.getByLabel('カテゴリ （必須）');
    this.categoryLevel2Select = page.locator('#form-item-level2-category-id');
    this.categoryLevel3Select = page.locator('#form-item-level3-category-id');
    this.colorCheckboxes = 'input.js-item-skus-color-ids';
    this.tagHiddenInput = page.locator('#form-item-tags');

    // Navigation — nextStepButton is conditionally rendered; it only appears
    // after all required form fields are filled.
    this.nextStepButton = page.getByRole('button', { name: '入力内容の確認' });
    this.confirmButton = page.locator('input.js-item-confirm');
    this.saveDraftButton = page.getByRole('button', { name: '保存する' });
  }

  async login(email: string, password: string, baseURL: string) {
    await this.page.goto(`${baseURL}/user/login`);
    await expect(this.page).toHaveURL(/\/user\/login/);

    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await Promise.all([
      this.page.waitForURL(`${baseURL}/my/home`, { timeout: 120_000 }),
      this.loginSubmit.click(),
    ]);
  }

  async navigateToNewItem(baseURL: string) {
    await this.page.goto(`${baseURL}/my/item/create`);
    await expect(this.page).toHaveURL(/\/my\/item\/create/);
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillDescription(description: string) {
    await this.descriptionInput.fill(description);
  }

  async fillPrice(price: string) {
    await this.priceInput.fill(price);
  }

  async selectStock(stock: string) {
    await this.stockSelect.selectOption(stock);
  }

  async selectMaterial(materialId: string | null) {
    if (!materialId) return;
    await expect(this.materialSelect).toBeAttached();
    await this.materialSelect.selectOption(materialId).catch(() => {
      console.warn('[creema] material option not selectable', materialId);
    });
  }

  async selectCategory(
    level1Id: string | null,
    level2Id: string | null,
    level3Id: string | null,
    level3Label: string | null,
  ) {
    if (!level1Id) return;
    await this.categoryLevel1Select.selectOption(level1Id);

    if (level2Id) {
      await expect(this.categoryLevel2Select).toBeEnabled({ timeout: 15_000 });
      const optionLocator = this.page.locator(
        `#form-item-level2-category-id option[value="${level2Id}"]`,
      );
      await expect(optionLocator).toHaveCount(1, { timeout: 15_000 });
      await this.categoryLevel2Select.selectOption(level2Id).catch(() => {
        console.warn('[creema] level2 option not selectable', level2Id);
      });

      if (level3Id || level3Label) {
        await this.setSelectValueByIdOrLabel(
          '#form-item-level3-category-id',
          level3Id,
          level3Label,
        );
      }
    }
  }

  async checkColors(colorIds: string[]) {
    for (const colorId of colorIds) {
      const checkbox = this.page.locator(`${this.colorCheckboxes}[value="${colorId}"]`);
      await expect(checkbox).toBeVisible();
      await checkbox.check({ force: true });
    }
  }

  async uploadImages(imageUrls: string[]) {
    const normalized = Array.from(new Set(imageUrls.filter(Boolean))).slice(0, 10);
    if (!normalized.length) return;
    const files = await downloadImages(normalized, 'creema-image');
    if (!files.length) return;
    try {
      await expect(this.imageFileInput).toBeAttached();
      await this.imageFileInput.setInputFiles(files);
      await this.waitForImagePreview(files.length);
    } catch (error) {
      console.warn('[creema] image upload failed', error);
    } finally {
      await cleanupTempFiles(files, 'creema');
    }
  }

  async goToShippingStep() {
    await this.nextStepButton.click();
  }

  async setSelectValue(selector: string, value: string): Promise<boolean> {
    if (!value) return false;
    return this.page.evaluate(
      ({ selector, value }) => {
        const element = document.querySelector<HTMLSelectElement>(selector);
        if (!element) return false;
        const hasOption = Array.from(element.options).some((option) => option.value === value);
        if (!hasOption) return false;
        element.value = value;
        const ev = { bubbles: true, cancelable: true };
        element.dispatchEvent(new Event('input', ev));
        element.dispatchEvent(new Event('change', ev));
        return true;
      },
      { selector, value },
    );
  }

  async setSelectValueByIdOrLabel(
    selector: string,
    id: string | null,
    label: string | null,
  ): Promise<boolean> {
    if (!id && !label) return false;
    const selectLocator = this.page.locator(selector);
    if (!(await selectLocator.count())) return false;
    await this.page
      .waitForFunction(
        (sel) => {
          const element = document.querySelector<HTMLSelectElement>(sel);
          return !!element && element.options.length > 1;
        },
        selector,
        { timeout: 10_000 },
      )
      .catch(() => {});

    return this.page.evaluate(
      ({ selector, id, label }) => {
        const element = document.querySelector<HTMLSelectElement>(selector);
        if (!element) return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
          element.classList.remove('u-hide');
          element.style.display = '';
          element.removeAttribute('style');
        }
        const options = Array.from(element.options);
        let targetValue: string | null = null;
        if (id && options.some((option) => option.value === id)) {
          targetValue = id;
        } else if (label) {
          const normalizedLabel = label.trim();
          const matched = options.find(
            (option) => (option.textContent ?? '').trim() === normalizedLabel,
          );
          if (matched) targetValue = matched.value;
        }
        if (!targetValue) return false;
        element.value = targetValue;
        const ev = { bubbles: true, cancelable: true };
        element.dispatchEvent(new Event('input', ev));
        element.dispatchEvent(new Event('change', ev));
        return true;
      },
      { selector, id, label },
    );
  }

  async setTextareaValue(selector: string, value: string): Promise<boolean> {
    if (!value) return false;
    return this.page.evaluate(
      ({ selector, value }) => {
        const element = document.querySelector<HTMLTextAreaElement>(selector);
        if (!element) return false;
        element.value = value;
        const ev = { bubbles: true, cancelable: true };
        element.dispatchEvent(new Event('input', ev));
        element.dispatchEvent(new Event('change', ev));
        return true;
      },
      { selector, value },
    );
  }

  async fillShippingOrigin(prefectureId: string | null): Promise<boolean> {
    if (!prefectureId) return false;
    return this.setSelectValue("select[name='item[delivery_from_prefecture_id]']", prefectureId);
  }

  async fillShippingMethod(methodId: string | null): Promise<boolean> {
    if (!methodId) return false;
    return this.setSelectValue("select[name='item[shipping_methods][]']", methodId);
  }

  async fillCraftPeriod(periodId: string | null): Promise<boolean> {
    if (!periodId) return false;
    return this.setSelectValue("select[name='item[craft_period]']", periodId);
  }

  async fillSizeFreeInput(text: string | null): Promise<boolean> {
    if (!text) return false;
    return this.setTextareaValue('#form-item-size-freeinput', text);
  }

  async confirmAndSaveDraft() {
    await expect(this.confirmButton).toBeVisible();
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'load' }),
      this.confirmButton.click(),
    ]);
    await expect(this.page).toHaveURL(/\/my\/item\/input\/preview/);

    const saveButton = this.page.getByRole('button', { name: '保存する' }).first();
    await expect(saveButton).toBeVisible();
    await saveButton.scrollIntoViewIfNeeded();
    await Promise.all([this.page.waitForNavigation({ waitUntil: 'load' }), saveButton.click()]);
    await expect(this.page).toHaveURL(/\/my\/item\/list\?status=draft/);
  }

  private async waitForImagePreview(expectedCount: number): Promise<void> {
    try {
      const preview = this.page.locator('#js-preview-item-image');
      await preview.waitFor({ state: 'visible', timeout: 15_000 });
      const previewItems = preview.locator(
        '.p-item-preview-images__media, .p-item-preview-images__seed',
      );
      await expect(previewItems).toHaveCount(expectedCount, {
        timeout: 15_000,
      });
    } catch (error) {
      console.warn('[creema] image preview wait failed', error);
    }
  }
}
