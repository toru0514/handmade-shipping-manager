import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/creema-auth.json',
});

test('test', async ({ page }) => {
  await page.goto('https://www.creema.jp/my/item/create');
  await page.getByRole('textbox', { name: '作品タイトル （必須） 作品写真 （必須）' }).click();
  await page.getByLabel('カテゴリ （必須）').click();
  await page.getByLabel('カテゴリ （必須）').selectOption('2');
  await page.locator('#form-item-level2-category-id').selectOption('216');
  await page.locator('#form-item-level3-category-id').selectOption('72');
  await page.getByRole('textbox', { name: '作品紹介文 （必須）' }).click();
  await page.getByRole('radio', { name: '展示する' }).check();
  await page.getByRole('textbox', { name: '作品紹介文 （必須）' }).click();
  await page.getByRole('textbox', { name: '作品紹介文 （必須）' }).fill('test');
  await page.getByRole('radio', { name: '展示する' }).check();
  await page.getByRole('radio', { name: '展示する' }).check();
  await page.getByRole('radio', { name: '販売する' }).check();
  await page.getByRole('textbox', { name: '価格 （必須）' }).click();
  await page.getByRole('textbox', { name: '価格 （必須）' }).fill('1111');
  await page.getByRole('checkbox', { name: '作品に種類を追加する' }).check();
  await page.getByRole('textbox', { name: '60文字以内' }).click();
  await page.getByRole('textbox', { name: '60文字以内' }).fill('test');
  await page.getByRole('button', { name: ' 種類を追加する' }).click();
  await page.getByRole('button', { name: ' 種類を追加する' }).click();
  await page.locator('input[name="item[skus][1][variety]"]').click();
  await page.locator('input[name="item[skus][1][variety]"]').fill('2');
  await page.getByRole('row', { name: '1 ', exact: true }).getByPlaceholder('文字以内').click();
  await page.locator('input[name="item[skus][1][variety]"]').fill('23');
  await page.getByRole('row', { name: '1 ', exact: true }).getByPlaceholder('文字以内').click();
  await page.getByRole('row', { name: '1 ', exact: true }).getByPlaceholder('文字以内').fill('3');
  await page.getByText('（まとめて最大20枚まで）').click();
  await page.getByRole('button', { name: 'Choose File' }).click();
  await page
    .getByRole('button', { name: 'Choose File' })
    .setInputFiles('2025-08-10_14-46-58_730.jpeg');
  await page
    .getByRole('row', { name: '選択してください -- --', exact: true })
    .locator('select[name="item[options][]"]')
    .selectOption('947260');
  await page.locator('#form-item-material-id').selectOption('12');
  await page.getByRole('checkbox', { name: '白' }).check();
  await page.getByRole('checkbox', { name: '黒' }).check();
  await page.getByRole('button', { name: 'タグを追加する' }).click();
  await page
    .getByRole('link', {
      name: 'モチーフ （アルファベット、数字、富士山、カメラ、めがね、家・建物・・・）  2個まで選択可',
    })
    .click();
  await page.getByText('アルファベット', { exact: true }).click();
  await page.getByText('数字', { exact: true }).click();
  await page
    .getByRole('link', {
      name: 'モチーフ （アルファベット、数字、富士山、カメラ、めがね、家・建物・・・）  2個まで選択可 アルファベット数字',
    })
    .click();
  await page.getByRole('link', { name: '素材 （k18（18' }).click();
  await page.getByText('k10（10金）').click();
  await page.getByText('チェリー', { exact: true }).click();
  await page.getByRole('link', { name: '素材 （k18（18' }).click();
  await page
    .getByRole('link', {
      name: 'テイスト （シンプル、かわいい、上品・きれいめ、アンティーク・・・）  2個まで選択可',
    })
    .click();
  await page.getByText('アンティーク', { exact: true }).click();
  await page.getByText('サーフ').click();
  await page
    .getByRole('link', {
      name: 'テイスト （シンプル、かわいい、上品・きれいめ、アンティーク・・・）  2個まで選択可 アンティークサーフ',
    })
    .click();
  await page.getByRole('link', { name: 'デザイン・特長 （フリーサイズ、2way' }).click();
  await page.getByText('フォークリング').click();
  await page.getByText('Vネック').click();
  await page.getByRole('link', { name: 'デザイン・特長 （フリーサイズ、2way' }).click();
  await page
    .getByRole('link', {
      name: '色味・色彩 （パステル、モノトーン、ローズピンク、キャメル・・・）  1個まで選択可',
    })
    .click();
  await page.getByText('ルビーレッド').click();
  page.once('dialog', (dialog) => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByText('サーモンピンク').click();
  await page
    .getByRole('link', {
      name: '色味・色彩 （パステル、モノトーン、ローズピンク、キャメル・・・）  1個まで選択可 ルビーレッド',
    })
    .click();
  await page
    .getByRole('link', {
      name: '制作手法 （西陣織、タンニン鞣し（渋鞣し）、彫金、美濃焼、つまみ細工・・・）  2個まで選択可',
    })
    .click();
  await page.getByText('ダメージ加工').click();
  await page.getByText('切子').click();
  await page
    .getByRole('link', {
      name: '制作手法 （西陣織、タンニン鞣し（渋鞣し）、彫金、美濃焼、つまみ細工・・・）  2個まで選択可 ダメージ加工切子',
    })
    .click();
  await page
    .getByRole('link', {
      name: 'シーン （ウェディング、フォーマル、お出かけ、旅行、新生活、DIY・・・）  2個まで選択可',
    })
    .click();
  await page.getByText('パーティ').click();
  await page.getByText('記念日', { exact: true }).click();
  await page
    .getByRole('link', {
      name: 'シーン （ウェディング、フォーマル、お出かけ、旅行、新生活、DIY・・・）  2個まで選択可 パーティ記念日',
    })
    .click();
  await page
    .getByRole('link', {
      name: 'イベント・ギフト （母の日、父の日、クリスマス、ハロウィン・・・）  2個まで選択可',
    })
    .click();
  await page.getByText('バレンタイン').click();
  await page.getByText('卒業式', { exact: true }).click();
  await page
    .getByRole('link', {
      name: 'イベント・ギフト （母の日、父の日、クリスマス、ハロウィン・・・）  2個まで選択可 バレンタイン卒業式',
    })
    .click();
  await page
    .getByRole('link', {
      name: 'ターゲット （メンズ、レディース、ユニセックス、男の子、女の子・・・）  2個まで選択可',
    })
    .click();
  await page
    .locator('span')
    .filter({ hasText: /^メンズ$/ })
    .click();
  await page.getByText('ユニセックス', { exact: true }).click();
  await page
    .getByRole('link', {
      name: 'ターゲット （メンズ、レディース、ユニセックス、男の子、女の子・・・）  2個まで選択可 メンズユニセックス',
    })
    .click();
  await page.getByRole('link', { name: '対応機種 （iPhone X、iPhone XS MAX、' }).click();
  await page.getByRole('link', { name: '対応機種 （iPhone X、iPhone XS MAX、' }).click();
  await page
    .getByRole('link', {
      name: 'お酒 （大吟醸、辛口、自家醸造、地域限定、フルーティ、ペールエール・・・）  2個まで選択可',
    })
    .click();
  await page
    .getByRole('link', {
      name: 'お酒 （大吟醸、辛口、自家醸造、地域限定、フルーティ、ペールエール・・・）  2個まで選択可',
    })
    .click();
  await page
    .getByRole('link', {
      name: '地域 （北海道、東京、鹿児島、沖縄、フランス、イタリア・・・）  1個まで選択可',
    })
    .click();
  await page
    .getByRole('link', {
      name: '地域 （北海道、東京、鹿児島、沖縄、フランス、イタリア・・・）  1個まで選択可',
    })
    .click();
  await page.getByRole('button', { name: '適用' }).nth(1).click();
  await page.locator('select[name="item[shipping_methods][]"]').selectOption('1920251');
  await page.locator('select[name="item[craft_period]"]').selectOption('4');
  await page.getByRole('textbox', { name: '500文字以内' }).click();
  await page.getByRole('button', { name: '入力内容の確認' }).click();
  await page.getByRole('textbox', { name: '作品タイトル （必須） 作品写真 （必須）' }).click();
  await page.getByRole('textbox', { name: '作品タイトル （必須） 作品写真 （必須）' }).fill('test');
  await page.getByRole('button', { name: '入力内容の確認' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
});
