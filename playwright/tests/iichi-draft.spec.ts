import { expect, test } from '@playwright/test';
import { googleSheetsProductRepository } from '@/adapters/google-sheets/product-repository';
import type { SpreadsheetProductRecord } from '@/application/types/product';
import { IichiPage } from './page-objects/iichi-page';
import { pickFirstNonEmpty, parseInteger, parseImageUrls, cleanupTempFiles } from './shared/utils';

const RUN_IICHI_FLOW = process.env.PLAYWRIGHT_RUN_IICHI === 'true';
const ENABLE_IICHI_CATEGORY_SELECTION = true;

test.describe('iichi 自動化フロー', () => {
  test.skip(!RUN_IICHI_FLOW, 'PLAYWRIGHT_RUN_IICHI=true を指定したときのみ実行します。');

  test('ログインして作品登録フォームに商品情報を入力', async ({ page }, testInfo) => {
    const email = process.env.PLAYWRIGHT_IICHI_EMAIL;
    const password = process.env.PLAYWRIGHT_IICHI_PASSWORD;
    test.skip(
      !email || !password,
      'PLAYWRIGHT_IICHI_EMAIL / PLAYWRIGHT_IICHI_PASSWORD を設定してください。',
    );

    const products = await listProductsForIichi();
    console.log(
      '[iichi-draft] ready products',
      products.map((p) => p.id),
    );
    test.skip(!products.length, 'iichi 対象のシート商品が見つかりませんでした。');

    const iichiPage = new IichiPage(page);

    await test.step('トップページからログインへ遷移', async () => {
      await iichiPage.navigateToLogin();
    });

    await test.step('メール・パスワードでログイン', async () => {
      await iichiPage.login(email!, password!);
    });

    for (const product of products) {
      const mapped = mapProductToIichiDraft(product);

      await test.step(`作品 ${product.id} の登録`, async () => {
        await iichiPage.navigateToNewItem();
        await iichiPage.fillProductForm(
          mapped.title,
          mapped.description,
          mapped.price,
          mapped.stock,
        );

        if (ENABLE_IICHI_CATEGORY_SELECTION && mapped.categoryParentLabel) {
          const parentSelected = await iichiPage.selectDropdownByLabel(
            'カテゴリ',
            mapped.categoryParentLabel,
            0,
          );
          if (!parentSelected) {
            console.warn('[iichi-draft] 親カテゴリを選択できません', mapped.categoryParentLabel);
          }
        }

        if (ENABLE_IICHI_CATEGORY_SELECTION && mapped.categoryChildLabel) {
          const childSelected = await iichiPage.selectDropdownByLabel(
            'カテゴリ',
            mapped.categoryChildLabel,
            1,
          );
          if (!childSelected) {
            console.warn('[iichi-draft] 子カテゴリを選択できません', mapped.categoryChildLabel);
          }
        }

        if (mapped.materialLabel) {
          const materialSelected = await iichiPage.selectDropdownByLabel(
            '素材',
            mapped.materialLabel,
          );
          if (!materialSelected) {
            console.warn('[iichi-draft] 素材を選択できません', mapped.materialLabel);
          }
        }

        const tempFiles = await iichiPage.uploadImages(mapped.imageUrls);
        try {
          if (!tempFiles.length && !mapped.imageUrls.length) {
            testInfo.annotations.push({
              type: 'WARN',
              description: '画像URLがないため、手動で画像をアップロードしてください。',
            });
          }

          if (mapped.shippingMethodLabel) {
            const shippingSelected = await iichiPage.selectDropdownByLabel(
              '配送方法',
              mapped.shippingMethodLabel,
            );
            if (!shippingSelected) {
              console.warn('[iichi-draft] 配送方法を選択できません', mapped.shippingMethodLabel);
            }
          }

          await iichiPage.saveAndVerify();
          testInfo.annotations.push({
            type: 'NEXT',
            description: '保存完了後のレビューや公開設定は画面上でご確認ください。',
          });
        } finally {
          await cleanupTempFiles(tempFiles, 'iichi');
        }
      });
    }
  });
});

type IichiDraftMapped = {
  title: string;
  description: string;
  price: string;
  stock: string;
  categoryParentLabel: string | null;
  categoryChildLabel: string | null;
  materialLabel: string | null;
  shippingMethodLabel: string | null;
  imageUrls: string[];
};

async function listProductsForIichi(): Promise<SpreadsheetProductRecord[]> {
  const products = await googleSheetsProductRepository.listProducts();
  console.log('[iichi-draft] fetched products', products.length);
  for (const p of products) {
    console.log('[iichi-draft] candidate', p.id, p.platforms, p.syncStatus);
  }
  return products.filter(
    (product) =>
      product.platforms.some((platform) => platform.toLowerCase() === 'iichi') &&
      product.syncStatus === 'ready',
  );
}

function mapProductToIichiDraft(product: SpreadsheetProductRecord): IichiDraftMapped {
  const title =
    pickFirstNonEmpty(product.raw['iichi_title'], product.title, product.raw['title']) ??
    `iichi商品 ${product.id}`;
  const description =
    pickFirstNonEmpty(
      product.raw['iichi_description'],
      product.description,
      product.raw['description'],
    ) ?? '';
  const price = (
    parseInteger(
      pickFirstNonEmpty(
        product.raw['iichi_price'],
        product.raw['price'],
        product.price != null ? product.price.toString() : null,
      ),
    ) ?? 0
  ).toString();
  const stock = Math.max(
    1,
    parseInteger(
      pickFirstNonEmpty(
        product.raw['iichi_stock'],
        product.raw['inventory'],
        product.inventory != null ? product.inventory.toString() : null,
      ),
    ) ?? 1,
  ).toString();

  return {
    title,
    description,
    price,
    stock,
    categoryParentLabel: pickFirstNonEmpty(
      product.raw['iichi_category_parent_label'],
      product.raw['category_common'],
      product.raw['category'],
    ),
    categoryChildLabel: pickFirstNonEmpty(
      product.raw['iichi_category_child_label'],
      product.raw['creema_category_level2_label'],
      product.raw['category_common'],
    ),
    materialLabel: pickFirstNonEmpty(
      product.raw['iichi_material_label'],
      product.raw['material'],
      product.raw['素材'],
    ),
    shippingMethodLabel: pickFirstNonEmpty(
      product.raw['iichi_shipping_method_label'],
      product.raw['shipping_method'],
      product.raw['配送方法'],
    ),
    imageUrls: parseImageUrls(
      pickFirstNonEmpty(
        product.raw['iichi_image_urls'],
        product.raw['image_urls'],
        product.raw['images'],
      ),
    ),
  };
}
