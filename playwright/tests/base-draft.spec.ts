import { expect, test } from '@playwright/test';
import { googleSheetsProductRepository } from '@/adapters/google-sheets/product-repository';
import type { SpreadsheetProductRecord } from '@/application/types/product';
import { BasePage } from './page-objects/base-page';
import { pickFirstNonEmpty, parseInteger, parseImageUrls, cleanupTempFiles } from './shared/utils';

const RUN_BASE_FLOW = process.env.PLAYWRIGHT_RUN_BASE === 'true';

test.describe('BASE 自動化フロー', () => {
  test.skip(!RUN_BASE_FLOW, 'PLAYWRIGHT_RUN_BASE=true を指定したときのみ実行します。');

  test('ログインして管理画面へ遷移する', async ({ page }, testInfo) => {
    const baseEmail = process.env.PLAYWRIGHT_BASE_EMAIL;
    const basePassword = process.env.PLAYWRIGHT_BASE_PASSWORD;
    const baseOrigin = process.env.BASE_BASE_URL ?? 'https://admin.thebase.com';

    test.skip(
      !baseEmail || !basePassword,
      'PLAYWRIGHT_BASE_EMAIL / PLAYWRIGHT_BASE_PASSWORD を設定してください。',
    );

    const readyProducts = await listProductsForBase();
    console.log(
      '[base-draft] ready products',
      readyProducts.map((p) => p.id),
    );
    test.skip(!readyProducts.length, 'BASE 対象のシート商品が見つかりませんでした。');

    const basePage = new BasePage(page, baseOrigin);

    testInfo.annotations.push({
      type: 'TODO',
      description: 'BASE のログインフォーム構造を確認し、セレクタや遷移先URLの検証を確定させる。',
    });

    let alreadyLoggedIn = false;

    await test.step('ログインページへ遷移', async () => {
      alreadyLoggedIn = await basePage.navigateToLogin();
    });

    if (!alreadyLoggedIn) {
      await test.step('認証情報を入力する', async () => {
        await basePage.fillCredentials(baseEmail!, basePassword!);
      });

      await test.step('手動でログイン/追加認証を完了する', async () => {
        testInfo.annotations.push({
          type: 'INFO',
          description:
            'メールアドレス/パスワード入力後、ブラウザ上でログインボタン押下と追加認証を手動で完了し、完了後に Resume を押してください。',
        });
        await basePage.waitForManualLogin();
      });
    }

    const openItemsPage = async () => {
      const tryOpen = async () => {
        await basePage.navigateToItemsList();
      };

      try {
        await tryOpen();
      } catch {
        testInfo.annotations.push({
          type: 'INFO',
          description:
            '商品を登録するボタンが見えない場合は、ブラウザでログイン/認証手続きを完了してから Resume を押してください。',
        });
        await page.pause();
        await tryOpen();
      }
    };

    for (const product of readyProducts) {
      const mappedProduct = mapProductToBaseDraft(product);

      await test.step(`商品 ${product.id} を登録`, async () => {
        await openItemsPage();
        await basePage.navigateToAddItem();
        await basePage.uncheckPublish();

        const tempFiles = await basePage.uploadImages(mappedProduct.imageUrls);
        try {
          if (!tempFiles.length && !mappedProduct.imageUrls.length) {
            testInfo.annotations.push({
              type: 'WARN',
              description: '画像URLが見つからないため、手動で画像をアップロードしてください。',
            });
          }

          await basePage.fillProductForm(
            mappedProduct.title,
            mappedProduct.description,
            mappedProduct.price,
            mappedProduct.stock,
          );

          await basePage.submitForm();
        } finally {
          await cleanupTempFiles(tempFiles, 'base');
        }
      });
    }
  });
});

type BaseDraftMapped = {
  title: string;
  description: string;
  price: string;
  stock: string;
  imageUrls: string[];
};

async function listProductsForBase(): Promise<SpreadsheetProductRecord[]> {
  const products = await googleSheetsProductRepository.listProducts();
  console.log('[base-draft] fetched products', products.length);
  for (const p of products) {
    console.log('[base-draft] candidate', p.id, p.platforms, p.syncStatus);
  }
  return (
    products.filter(
      (product) =>
        product.platforms.some((platform) => platform.toLowerCase() === 'base') &&
        product.syncStatus === 'ready',
    ) ?? []
  );
}

function mapProductToBaseDraft(product: SpreadsheetProductRecord): BaseDraftMapped {
  const title =
    pickFirstNonEmpty(product.raw['base_title'], product.title, product.raw['title']) ??
    `BASE商品 ${product.id}`;
  const description =
    pickFirstNonEmpty(
      product.raw['base_description'],
      product.description,
      product.raw['description'],
    ) ?? '';
  const priceCandidate = pickFirstNonEmpty(
    product.raw['base_price'],
    product.raw['price'],
    product.price != null ? product.price.toString() : null,
  );
  const stockCandidate = pickFirstNonEmpty(
    product.raw['base_inventory'],
    product.raw['inventory'],
    product.inventory != null ? product.inventory.toString() : null,
  );
  const priceValue = parseInteger(priceCandidate);
  const stockValue = parseInteger(stockCandidate);

  const normalizedPrice = priceValue && priceValue > 0 ? priceValue : 1000;
  const normalizedStock = stockValue && stockValue > 0 ? stockValue : 1;

  const imageUrls = Array.from(
    new Set(
      parseImageUrls(
        pickFirstNonEmpty(
          product.raw['base_image_urls'],
          product.raw['image_urls'],
          product.raw['images'],
        ),
      ),
    ),
  ).slice(0, 10);

  return {
    title,
    description,
    price: normalizedPrice.toString(),
    stock: normalizedStock.toString(),
    imageUrls,
  };
}
