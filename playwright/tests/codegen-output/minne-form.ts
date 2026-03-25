import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/minne-auth.json',
});

test('test', async ({ page }) => {
  await page.goto('https://minne.com/account/products/new');
  await page
    .getByRole('button', {
      name: 'ドラッグ&ドロップ または クリック して 画像をアップロード 最大25枚まで追加できます',
    })
    .click();
  await page
    .getByRole('button', {
      name: 'ドラッグ&ドロップ または クリック して 画像をアップロード 最大25枚まで追加できます',
    })
    .setInputFiles('2025-08-10_14-46-58_730.jpeg');
  await page.getByRole('textbox', { name: '作品名 (100文字まで) ※必須' }).click();
  await page.getByRole('textbox', { name: '作品名 (100文字まで) ※必須' }).fill('test');
  await page.getByLabel('大カテゴリー').selectOption('1');
  await page.getByLabel('小カテゴリー').selectOption('3');
  await page.locator('#characteristic-group-section > div > div').first().click();
  await page
    .locator(
      'label:nth-child(16) > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .click();
  await page
    .locator(
      'div:nth-child(2) > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__pUjSL > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .click();
  await page
    .locator(
      'div:nth-child(3) > label > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .first()
    .click();
  await page
    .locator(
      'div:nth-child(3) > label:nth-child(3) > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .click();
  await page
    .locator(
      'div:nth-child(3) > label:nth-child(4) > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .click();
  await page
    .locator(
      'div:nth-child(3) > label:nth-child(5) > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .click();
  await page
    .locator(
      'div:nth-child(4) > label > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .first()
    .click();
  await page
    .locator(
      'div:nth-child(4) > label:nth-child(3) > .MinneAccountPhysicalProductCharacteristicSelect_characteristic-check-box__indicator__OMbcS',
    )
    .click();
  await page.getByRole('textbox', { name: '作品説明 (2000文字まで)' }).click();
  await page.getByRole('textbox', { name: '作品説明 (2000文字まで)' }).fill('test');
  await page.getByRole('textbox', { name: 'ハッシュタグ  0 / 5' }).click();
  await page.getByRole('textbox', { name: 'ハッシュタグ  0 / 5' }).press('KanjiMode');
  await page.getByRole('textbox', { name: 'ハッシュタグ  0 / 5' }).fill('アクセサリー');
  await page.getByRole('textbox', { name: 'ハッシュタグ  0 / 5' }).press('Enter');
  await page.getByRole('textbox', { name: 'ハッシュタグ  0 / 5' }).fill('アクセサリー');
  await page.getByRole('textbox', { name: 'ハッシュタグ  1 / 5' }).fill('ピアス');
  await page.getByRole('textbox', { name: 'ハッシュタグ  1 / 5' }).press('Enter');
  await page.getByRole('textbox', { name: 'ハッシュタグ  1 / 5' }).fill('ピアス');
  await page.getByRole('textbox', { name: 'ハッシュタグ  2 / 5' }).fill('ハンドメイド');
  await page.getByRole('textbox', { name: 'ハッシュタグ  2 / 5' }).press('Enter');
  await page.getByRole('textbox', { name: 'ハッシュタグ  2 / 5' }).fill('ハンドメイド');
  await page.getByRole('textbox', { name: 'ハッシュタグ  3 / 5' }).fill('てんねんs');
  await page.getByRole('textbox', { name: 'ハッシュタグ  3 / 5' }).press('Tab');
  await page.getByRole('button', { name: '閉じる' }).nth(3).click();
  await page.getByRole('spinbutton', { name: '販売価格 ※必須 販売価格' }).click();
  await page.getByRole('spinbutton', { name: '販売価格 ※必須 販売価格' }).press('Tab');
  await page.getByRole('link', { name: '「自分にあわせた販売価格の見直し方」を学ぶ' }).press('Tab');
  await page.getByRole('spinbutton', { name: '販売価格 ※必須 販売価格' }).click();
  await page.getByRole('spinbutton', { name: '販売価格 ※必須 販売価格' }).fill('');
  await page.getByRole('spinbutton', { name: '販売価格 ※必須 販売価格' }).press('Eisu');
  await page.getByRole('spinbutton', { name: '販売価格 ※必須 販売価格' }).fill('1111');
  await page.getByRole('spinbutton', { name: '在庫と単位 ※必須 在庫と単位' }).click();
  await page.getByRole('spinbutton', { name: '在庫と単位 ※必須 在庫と単位' }).click();
  await page.getByRole('spinbutton', { name: '在庫と単位 ※必須 在庫と単位' }).click();
  await page.getByRole('spinbutton', { name: '在庫と単位 ※必須 在庫と単位' }).click();
  await page.getByRole('spinbutton', { name: '在庫と単位 ※必須 在庫と単位' }).fill('5');
  await page.getByRole('textbox', { name: '単位（個・枚・点など）' }).click();
  await page.getByRole('textbox', { name: '単位（個・枚・点など）' }).click();
  await page.getByRole('textbox', { name: 'サイズ サイズ' }).click();
  await page.getByRole('textbox', { name: '購入時の注意点 (5000文字まで) 購入時の注意点' }).click();
  await page.getByRole('spinbutton', { name: '発送までの目安 ※必須 発送までの目安' }).click();
  await page.getByRole('button', { name: 'オプションを追加する' }).click();
  await page.getByLabel('オプション').selectOption('1351504');
  await page.getByRole('button', { name: 'オプションを追加する' }).click();
  await page.getByLabel('オプション2').selectOption('1689747');
  await page.getByLabel('配送方法', { exact: true }).selectOption('宅急便コンパクト');
  await page.getByRole('button', { name: 'この内容で登録・更新する' }).click();
  await page
    .getByRole('spinbutton', { name: '発送までの目安 ※必須 必須項目です 発送までの目安' })
    .click();
  await page
    .getByRole('spinbutton', { name: '発送までの目安 ※必須 必須項目です 発送までの目安' })
    .fill('5');
  await page.getByRole('button', { name: 'この内容で登録・更新する' }).click();
});
