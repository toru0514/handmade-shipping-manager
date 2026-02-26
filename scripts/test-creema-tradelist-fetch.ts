/**
 * creema 取引一覧ベースの動作確認スクリプト
 *
 * 実行方法:
 *   npx tsx scripts/test-creema-tradelist-fetch.ts <注文ID>
 *
 * フロー:
 *   1. creemaにログイン
 *   2. /my/tradenavi/list で指定注文IDを検索
 *   3. 該当行の基本情報と取引ナビURLを表示
 *   4. 取引ナビ画面まで遷移確認
 */

import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CREEMA_LOGIN_URL = 'https://www.creema.jp/login';
const CREEMA_TRADE_LIST_URL = 'https://www.creema.jp/my/tradenavi/list';

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

type TradeListFound = {
  orderId: string;
  tradenaviUrl: string | null;
  title: string | null;
  option: string | null;
  partner: string | null;
  partnerFullname: string | null;
  tradeDate: string | null;
  status: string | null;
};

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), '.env.local'));

  const orderId = process.argv[2]?.trim();
  if (!orderId) {
    console.error('エラー: 注文IDを引数で指定してください');
    console.error('使用方法: npx tsx scripts/test-creema-tradelist-fetch.ts <注文ID>');
    process.exit(1);
  }

  const email = process.env['CREEMA_EMAIL']?.trim();
  const password = process.env['CREEMA_PASSWORD']?.trim();
  if (!email || !password) {
    console.error('エラー: CREEMA_EMAIL / CREEMA_PASSWORD を .env.local に設定してください');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  try {
    const page = await browser.newPage();

    console.log('[creema-smoke] ログイン開始');
    await page.goto(CREEMA_LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await page.click('input.js-user-login-button[value="ログイン"]');

    // ログイン完了待ち
    await page.waitForURL(/\/my\/tradenavi\/list/, { timeout: 45_000 }).catch(() => undefined);
    await page.goto(CREEMA_TRADE_LIST_URL, { waitUntil: 'domcontentloaded' });

    const found = await page.evaluate((targetOrderId): TradeListFound | null => {
      const spans = Array.from(document.querySelectorAll('span'));
      const orderSpan = spans.find((span) =>
        (span.textContent ?? '').replace(/\s+/g, ' ').trim().includes(`注文ID：${targetOrderId}`),
      );
      if (!orderSpan) return null;

      const headerTr = orderSpan.closest('tr');
      if (!headerTr) return null;

      const actionLink = headerTr.querySelector<HTMLAnchorElement>('a[href*="/tradenavi/"]');
      const firstDataTr = headerTr.nextElementSibling as HTMLTableRowElement | null;

      const titleAnchor = firstDataTr?.querySelector<HTMLAnchorElement>(
        'a.u-text-deco--none.u-block.u-text-bold',
      );
      const optionEl = firstDataTr?.querySelector<HTMLElement>(
        '.p-my-tradenavi-list-table-margin-t-sm',
      );

      const rowSpanTds = firstDataTr ? Array.from(firstDataTr.querySelectorAll('td[rowspan]')) : [];
      const partnerAnchor =
        rowSpanTds[0]?.querySelector<HTMLAnchorElement>('a[href*="/user/"]') ?? null;
      const partnerFullnameEl =
        rowSpanTds[0]?.querySelector<HTMLElement>('.p-my-tradenavi-list-table__fullname') ?? null;

      return {
        orderId: targetOrderId,
        tradenaviUrl: actionLink?.getAttribute('href') ?? null,
        title: (titleAnchor?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        option: (optionEl?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        partner: (partnerAnchor?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        partnerFullname: (partnerFullnameEl?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        tradeDate: (rowSpanTds[1]?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        status: (rowSpanTds[2]?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      };
    }, orderId);

    if (!found) {
      throw new Error(`注文ID ${orderId} が取引一覧で見つかりませんでした`);
    }

    const tradenaviUrl = found.tradenaviUrl
      ? new URL(found.tradenaviUrl, 'https://www.creema.jp').toString()
      : null;

    console.log('\n===== 一覧抽出結果 =====');
    console.log(JSON.stringify({ ...found, tradenaviUrl }, null, 2));
    console.log('=======================\n');

    if (!tradenaviUrl) {
      throw new Error('取引ナビURLを取得できませんでした');
    }

    await page.goto(tradenaviUrl, { waitUntil: 'domcontentloaded' });
    console.log(`[creema-smoke] 取引ナビ到達: ${page.url()}`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error('[creema-smoke] エラーが発生しました');
  console.error(error);
  process.exit(1);
});
