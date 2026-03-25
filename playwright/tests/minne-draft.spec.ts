import { expect, test } from '@playwright/test';
import { googleSheetsProductRepository } from '@/adapters/google-sheets/product-repository';
import type { SpreadsheetProductRecord } from '@/application/types/product';
import {
  resolveMinneParentIdByLabel,
  resolveMinneChildIdByLabel,
} from '@/lib/categories/minne-categories';
import { MinnePage } from './page-objects/minne-page';
import { GmailClient } from './shared/gmail-client';
import {
  pickFirstNonEmpty,
  parseInteger,
  parseImageUrls,
  normalizeId,
  cleanupTempFiles,
} from './shared/utils';

const RUN_MINNE_FLOW = process.env.PLAYWRIGHT_RUN_MINNE === 'true';

test.describe('minne 自動化フロー', () => {
  test.skip(!RUN_MINNE_FLOW, 'PLAYWRIGHT_RUN_MINNE=true を指定したときのみ実行します。');

  test('ログインして商品登録フォームに下書きを入力', async ({ page }, testInfo) => {
    const minneEmail = process.env.PLAYWRIGHT_MINNE_EMAIL;
    test.skip(!minneEmail, 'PLAYWRIGHT_MINNE_EMAIL を設定してください。');

    const gmailClientId = process.env.GOOGLE_CLIENT_ID;
    const gmailClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const gmailAccessToken = process.env.GMAIL_ACCESS_TOKEN;
    const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
    test.skip(
      !gmailClientId || !gmailClientSecret || !gmailAccessToken || !gmailRefreshToken,
      'Gmail API credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_ACCESS_TOKEN, GMAIL_REFRESH_TOKEN) を設定してください。',
    );

    const products = await listProductsForMinne();
    console.log(
      '[minne-draft] ready products',
      products.map((p) => p.id),
    );
    test.skip(!products.length, 'minne 対象のシート商品が見つかりませんでした。');

    const minnePage = new MinnePage(page);
    const gmailClient = new GmailClient({
      clientId: gmailClientId!,
      clientSecret: gmailClientSecret!,
      accessToken: gmailAccessToken!,
      refreshToken: gmailRefreshToken!,
    });

    let sentAfter: Date;

    await test.step('ログインリンクを送信', async () => {
      sentAfter = new Date();
      await minnePage.sendLoginLink(minneEmail!);
    });

    await test.step('ログインリンクをメールから取得して開く', async () => {
      const magicLink = await gmailClient.fetchMinneMagicLink(sentAfter);
      console.log('[minne-draft] magic link obtained');
      await minnePage.openLoginLink(magicLink);
    });

    await test.step('マイページを開く', async () => {
      await minnePage.navigateToHome();
    });

    for (const product of products) {
      const mapped = mapProductToMinneDraft(product);
      await test.step(`作品 ${product.id} の入力`, async () => {
        await minnePage.navigateToNewProduct();
        await minnePage.fillTitle(mapped.title);
        await minnePage.selectCategory(mapped.categoryParentId, mapped.categoryId);
        await minnePage.fillDescription(mapped.description);
        await minnePage.fillPrice(mapped.price);
        await minnePage.fillStock(mapped.stock);
        await minnePage.fillShippingDays(mapped.shippingDays);

        const imageFiles = await minnePage.uploadImages(mapped.imageUrls);
        try {
          if (!imageFiles.length && !mapped.imageUrls.length) {
            testInfo.annotations.push({
              type: 'WARN',
              description: '画像URLがないため、手動で画像をアップロードしてください。',
            });
          }

          await minnePage.fillShipping(
            mapped.shippingMethod,
            mapped.shippingArea,
            mapped.shippingFee,
            mapped.shippingAdditionalFee,
          );

          await minnePage.submitForm();
        } finally {
          await cleanupTempFiles(imageFiles, 'minne');
        }
      });
    }
  });
});

type MinneDraftMapped = {
  title: string;
  description: string;
  price: string;
  stock: string;
  shippingDays: string;
  categoryParentId: string | null;
  categoryId: string | null;
  shippingMethod: string | null;
  shippingArea: string | null;
  shippingFee: string | null;
  shippingAdditionalFee: string | null;
  imageUrls: string[];
};

async function listProductsForMinne(): Promise<SpreadsheetProductRecord[]> {
  const products = await googleSheetsProductRepository.listProducts();
  console.log('[minne-draft] fetched products', products.length);
  for (const p of products) {
    console.log('[minne-draft] candidate', p.id, p.platforms, p.syncStatus);
  }
  return products.filter(
    (product) =>
      product.platforms.some((platform) => platform.toLowerCase() === 'minne') &&
      product.syncStatus === 'ready',
  );
}

function mapProductToMinneDraft(product: SpreadsheetProductRecord): MinneDraftMapped {
  const title =
    pickFirstNonEmpty(product.raw['minne_title'], product.title, product.raw['title']) ??
    `minne商品 ${product.id}`;
  const description =
    pickFirstNonEmpty(
      product.raw['minne_description'],
      product.description,
      product.raw['description'],
    ) ?? '';
  const priceValue =
    parseInteger(
      pickFirstNonEmpty(
        product.raw['minne_price'],
        product.raw['price'],
        product.price != null ? product.price.toString() : null,
      ),
    ) ?? 0;
  const stockValue =
    parseInteger(
      pickFirstNonEmpty(
        product.raw['minne_inventory'],
        product.raw['inventory'],
        product.inventory != null ? product.inventory.toString() : null,
      ),
    ) ?? 1;
  const shippingDaysValue =
    parseInteger(
      pickFirstNonEmpty(
        product.raw['minne_shipping_days'],
        product.raw['production_lead_time_days'],
        product.raw['制作期間'],
      ),
    ) ?? 0;

  const shippingFeeValue = parseInteger(
    pickFirstNonEmpty(product.raw['minne_shipping_fee'], product.raw['shipping_fee']),
  );
  const shippingAdditionalValue = parseInteger(product.raw['minne_shipping_additional_fee']);

  // カテゴリ: ラベル列またはID列から解決
  const categoryParentLabel = product.raw['minne_category_parent_label'];
  const categoryChildLabel = product.raw['minne_category_label'];

  let categoryParentId = normalizeId(product.raw['minne_category_parent_id']);
  let categoryId = normalizeId(product.raw['minne_category_id']);

  // ラベルからIDを解決（ID列がない場合のフォールバック）
  if (!categoryParentId && categoryParentLabel) {
    categoryParentId = resolveMinneParentIdByLabel(categoryParentLabel);
  }
  if (!categoryId && categoryParentLabel && categoryChildLabel) {
    categoryId = resolveMinneChildIdByLabel(categoryParentLabel, categoryChildLabel);
  }

  return {
    title,
    description,
    price: Math.max(50, priceValue).toString(),
    stock: Math.max(1, stockValue).toString(),
    shippingDays: Math.min(120, Math.max(0, shippingDaysValue)).toString(),
    categoryParentId,
    categoryId,
    shippingMethod: pickFirstNonEmpty(
      product.raw['minne_shipping_method'],
      product.raw['shipping_method'],
    ),
    shippingArea:
      pickFirstNonEmpty(
        product.raw['minne_shipping_area'],
        product.raw['shipping_origin_pref'],
        product.raw['発送元'],
      ) ?? '全国一律',
    shippingFee: shippingFeeValue != null ? shippingFeeValue.toString() : null,
    shippingAdditionalFee:
      shippingAdditionalValue != null ? shippingAdditionalValue.toString() : '0',
    imageUrls: parseImageUrls(
      pickFirstNonEmpty(
        product.raw['minne_image_urls'],
        product.raw['image_urls'],
        product.raw['images'],
      ),
    ),
  };
}
