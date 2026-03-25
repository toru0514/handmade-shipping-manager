import { expect, test } from '@playwright/test';
import { IichiPage } from './page-objects/iichi-page';
import { BasePage } from './page-objects/base-page';
import { MinnePage } from './page-objects/minne-page';
import { CreemaPage } from './page-objects/creema-page';

test.describe('iichi selectors', () => {
  test.skip(
    process.env.PLAYWRIGHT_RUN_IICHI !== 'true',
    'PLAYWRIGHT_RUN_IICHI=true を指定したときのみ実行します。',
  );

  test('フォームページの主要セレクタが存在する', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('iichi'), 'iichi プロジェクトでのみ実行します。');

    const iichiPage = new IichiPage(page);
    await iichiPage.navigateToNewItem();

    await expect(iichiPage.titleInput).toBeAttached({ timeout: 10_000 });
    await expect(iichiPage.descriptionTextarea).toBeAttached({ timeout: 10_000 });
    await expect(iichiPage.priceInput).toBeAttached({ timeout: 10_000 });
    await expect(iichiPage.stockInput).toBeAttached({ timeout: 10_000 });
    await expect(iichiPage.imageFileInput).toBeAttached({ timeout: 10_000 });
    await expect(iichiPage.saveButton).toBeAttached({ timeout: 10_000 });
  });
});

test.describe('base selectors', () => {
  test.skip(
    process.env.PLAYWRIGHT_RUN_BASE !== 'true',
    'PLAYWRIGHT_RUN_BASE=true を指定したときのみ実行します。',
  );

  test('フォームページの主要セレクタが存在する', async ({ page, baseURL }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('base'), 'base プロジェクトでのみ実行します。');

    const basePage = new BasePage(page, baseURL);
    await page.goto(`${baseURL}/shop_admin/items/add`, { waitUntil: 'domcontentloaded' });

    await expect(basePage.titleInput).toBeAttached({ timeout: 10_000 });
    await expect(basePage.descriptionInput).toBeAttached({ timeout: 10_000 });
    await expect(basePage.priceInput).toBeAttached({ timeout: 10_000 });
    await expect(basePage.stockInput).toBeAttached({ timeout: 10_000 });
    await expect(basePage.imageFileInput).toBeAttached({ timeout: 10_000 });
    await expect(basePage.publishInput).toBeAttached({ timeout: 10_000 });
    await expect(basePage.registerButton).toBeAttached({ timeout: 10_000 });
  });
});

test.describe('minne selectors', () => {
  test.skip(
    process.env.PLAYWRIGHT_RUN_MINNE !== 'true',
    'PLAYWRIGHT_RUN_MINNE=true を指定したときのみ実行します。',
  );

  test('フォームページの主要セレクタが存在する', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('minne'), 'minne プロジェクトでのみ実行します。');

    const minnePage = new MinnePage(page);
    await minnePage.navigateToNewProduct();

    await expect(minnePage.titleInput).toBeAttached({ timeout: 10_000 });
    await expect(minnePage.categoryParentSelect).toBeAttached({ timeout: 10_000 });
    await expect(minnePage.descriptionTextarea).toBeAttached({ timeout: 10_000 });
    await expect(minnePage.priceInput).toBeAttached({ timeout: 10_000 });
    await expect(minnePage.stockInput).toBeAttached({ timeout: 10_000 });
    await expect(minnePage.shippingDaysInput).toBeAttached({ timeout: 10_000 });
    await expect(minnePage.imageFileInput).toBeAttached({ timeout: 10_000 });
    await expect(minnePage.submitButton).toBeAttached({ timeout: 10_000 });
  });
});

test.describe('creema selectors', () => {
  test.skip(
    process.env.PLAYWRIGHT_RUN_CREEMA !== 'true',
    'PLAYWRIGHT_RUN_CREEMA=true を指定したときのみ実行します。',
  );

  test('フォームページの主要セレクタが存在する', async ({ page, baseURL }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('creema'), 'creema プロジェクトでのみ実行します。');

    const creemaPage = new CreemaPage(page);
    await creemaPage.navigateToNewItem(baseURL!);

    await expect(creemaPage.titleInput).toBeAttached({ timeout: 10_000 });
    await expect(creemaPage.descriptionInput).toBeAttached({ timeout: 10_000 });
    await expect(creemaPage.priceInput).toBeAttached({ timeout: 10_000 });
    await expect(creemaPage.stockSelect).toBeAttached({ timeout: 10_000 });
    await expect(creemaPage.materialSelect).toBeAttached({ timeout: 10_000 });
    await expect(creemaPage.imageFileInput).toBeAttached({ timeout: 10_000 });
    await expect(creemaPage.categoryLevel1Select).toBeAttached({ timeout: 10_000 });

    // nextStepButton は全必須項目入力後に条件付き表示されるため、健全性チェックからは除外
    // 動作確認は creema-draft.spec.ts の goToShippingStep() で行う
  });
});
