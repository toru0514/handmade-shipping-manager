import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/base-auth.json',
});

test('test', async ({ page }) => {
  await page.goto('https://admin.thebase.com/shop_admin/items/add');
  await page.getByRole('textbox', { name: '商品名' }).click();
  await page.getByRole('textbox', { name: '商品名' }).fill('aaa');
  await page.getByRole('button', { name: 'Choose File' }).click();
  await page
    .getByRole('button', { name: 'Choose File' })
    .setInputFiles('2025-08-10_14-46-58_730.jpeg');
  await page.getByRole('textbox', { name: '商品説明' }).click();
  await page.getByRole('textbox', { name: '商品説明' }).fill('aaaa');
  await page.getByRole('textbox', { name: '価格(税込) 必須' }).click();
  await page.getByRole('textbox', { name: '価格(税込) 必須' }).fill('11111');
  await page
    .locator('div')
    .filter({ hasText: /^10％（標準税率）$/ })
    .first()
    .click();
  await page.getByTestId('pulldown_taxRate').click();
  await page.getByTestId('pulldown_taxRate').click();
  await page.getByRole('textbox', { name: '在庫と種類 必須' }).click();
  await page.getByRole('button', { name: ' 種類を追加する' }).click();
  await page.locator('input[name="variationText_0ebdf83a-1082-4737-87f8-17476c40d3d8"]').click();
  await page.locator('input[name="variationText_0ebdf83a-1082-4737-87f8-17476c40d3d8"]').fill('12');
  await page.getByRole('row', { name: '0 ', exact: true }).getByPlaceholder('サイズS').click();
  await page.getByRole('row', { name: '0 ', exact: true }).getByPlaceholder('サイズS').click();
  await page.getByRole('row', { name: '0 ', exact: true }).getByPlaceholder('サイズS').fill('22');
  await page.getByRole('row', { name: '12 0 ' }).getByPlaceholder('0~').dblclick();
  await page.getByRole('row', { name: '12 0 ' }).getByPlaceholder('0~').fill('3');
  await page.getByRole('row', { name: '0 ' }).getByPlaceholder('0~').click();
  await page.getByRole('row', { name: '0 ' }).getByPlaceholder('0~').click();
  await page.getByRole('row', { name: '0 ' }).getByPlaceholder('0~').fill('3');
  await page
    .locator('div')
    .filter({ hasText: /^商品一覧の先頭に追加する$/ })
    .nth(1)
    .click();
  await page.locator('label').filter({ hasText: '非公開' }).click();
  await page
    .locator('label')
    .filter({ hasText: /^公開$/ })
    .click();
  await page.getByText('公開非公開').click();
  await page.locator('label').filter({ hasText: '非公開' }).click();
  await page
    .locator('div')
    .filter({ hasText: /^アクセサリー$/ })
    .nth(1)
    .click();
  await page.getByText('+ 大カテゴリを追加').click();
  await page.locator('span').filter({ hasText: 'アクセサリー' }).click();
  await page.getByText('メンズ').click();
  await page.getByText('ネクタイピン・カフス').click();
  await page.locator('.c-modal__head__icon').click();
  await page
    .locator('div')
    .filter({ hasText: /^アクセサリー$/ })
    .nth(1)
    .click();
  await page.goto('https://admin.thebase.com/shop_admin/items/?page=1');
});
