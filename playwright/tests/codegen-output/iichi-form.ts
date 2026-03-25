import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/iichi-auth.json',
});

test('test', async ({ page }) => {
  await page.goto('https://www.iichi.com/your/item/create');
  await page.locator('#el-id-5746-77').click();
  await page.locator('#el-id-5746-77').fill('TEST');
  await page.locator('#el-id-5746-78').click();
  await page.locator('#el-id-5746-78').fill('');
  await page.locator('#el-id-5746-78').press('KanjiMode');
  await page.locator('#el-id-5746-78').fill('紹介文');
  await page.locator('#el-id-5746-78').press('Eisu');
  await page.locator('path').nth(4).click();
  await page
    .getByText('7 木材工房cloud9')
    .setInputFiles('スクリーンショット 2026-03-09 13.31.01.png');
  await page.locator('#el-id-5746-79').click();
  await page.locator('#el-id-5746-79').fill('1000');
  await page.locator('#el-id-5746-80').click();
  await page
    .locator('div')
    .filter({ hasText: /^購入オプションを追加$/ })
    .first()
    .click();
  await page.getByRole('radio', { name: '対応する' }).check();
  await page.getByText('対応しない').click();
  await page.getByText('受注する').click();
  await page.getByRole('radio', { name: '受注しない' }).check();
  await page
    .locator('div')
    .filter({ hasText: /^選択してください$/ })
    .nth(1)
    .click();
  await page.getByRole('option', { name: 'アクセサリー' }).click();
  await page.getByText('選択してください').click();
  await page.getByRole('option', { name: 'ピアス', exact: true }).click();
  await page
    .locator('div')
    .filter({ hasText: /^選択しない$/ })
    .nth(3)
    .click();
  await page.getByRole('option', { name: '木・竹・漆' }).click();
  await page.locator('label').filter({ hasText: '赤' }).click();
  await page.locator('.color-pink').click();
  await page.locator('.color-orange').click();
  await page.locator('#el-id-5746-85').click();
  await page.locator('#el-id-5746-85').fill('#');
  await page.locator('#el-id-5746-85').press('KanjiMode');
  await page.locator('#el-id-5746-85').fill('#アクセサリー');
  await page.locator('#el-id-5746-85').press('Enter');
  await page.locator('#el-id-5746-85').fill('#アクセサリー');
  await page.locator('#el-id-5746-85').press('Eisu');
  await page.locator('#el-id-5746-85').fill('#');
  await page.locator('#el-id-5746-85').press('KanjiMode');
  await page.locator('#el-id-5746-85').fill('#指輪');
  await page.locator('#el-id-5746-85').press('Enter');
  await page.locator('#el-id-5746-85').fill('#指輪');
  await page.locator('#el-id-5746-85').press('Eisu');
  await page.locator('#el-id-5746-85').fill('#');
  await page.locator('#el-id-5746-85').press('KanjiMode');
  await page.locator('#el-id-5746-85').fill('#ピアス');
  await page.locator('#el-id-5746-85').press('Enter');
  await page.locator('#el-id-5746-85').fill('#ピアス');
  await page.locator('#el-id-5746-85').press('Eisu');
  await page.getByText('配送方法を追加', { exact: true }).click();
  await page.locator('#el-id-5746-92').click();
  await page
    .locator('.el-select__wrapper.is-hovering > .el-select__suffix > .el-icon > svg')
    .click();
  await page.getByRole('option', { name: '3日', exact: true }).click();
  await page.locator('#el-id-5746-89').click();
  await page.locator('#el-id-5746-90').click();
  await page.locator('.el-switch__core').click();
  await page.locator('.el-switch__core').click();
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('link', { name: '作品管理へ戻る' }).click();
});
