/**
 * minne 未登録注文の一括取得 → スプレッドシート保存スクリプト
 *
 * 実行方法:
 *   npx tsx scripts/test-minne-batch-fetch.ts
 *
 * フロー:
 *   1. minne にマジックリンクでログイン（Gmail 自動取得）
 *   2. 注文一覧ページから全注文 ID を取得
 *   3. スプシに未登録の注文だけを minne から個別に取得
 *   4. OrderFactory で Order に変換してスプシに保存
 *   5. 処理結果を表示
 *
 * .env.local から以下を自動読み込みします:
 *   MINNE_EMAIL, GMAIL_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *   GOOGLE_SERVICE_ACCOUNT_BASE64, GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_SHEET_NAME
 */

import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OrderFactory } from '../src/domain/factories/OrderFactory';
import { OrderId } from '../src/domain/valueObjects/OrderId';
import { Platform } from '../src/domain/valueObjects/Platform';
import { MinnePage } from '../src/infrastructure/external/playwright/MinnePage';
import { GoogleGmailClient } from '../src/infrastructure/external/google/GmailClient';
import { GoogleSheetsClient } from '../src/infrastructure/external/google/SheetsClient';
import { SpreadsheetOrderRepository } from '../src/infrastructure/adapters/persistence/SpreadsheetOrderRepository';

// ---- ユーティリティ ----

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

function promptUser(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim());
    });
  });
}

// ---- Gmail からログインリンク取得（test-minne-fetch.ts と同じロジック） ----

async function fetchLoginUrl(sentAt: Date, email: string): Promise<string> {
  const gmailClient = new GoogleGmailClient({
    accessToken: process.env['GMAIL_ACCESS_TOKEN'],
    refreshToken: process.env['GMAIL_REFRESH_TOKEN'],
    clientId: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  });

  const hasGmailCreds = Boolean(
    process.env['GMAIL_ACCESS_TOKEN'] || process.env['GMAIL_REFRESH_TOKEN'],
  );

  if (hasGmailCreds) {
    console.log('         (最大60秒ポーリング中...)');
    try {
      const url = await gmailClient.fetchMinneMagicLink(sentAt, {
        intervalMs: 3_000,
        timeoutMs: 60_000,
      });
      console.log('        → ログインリンク取得成功');
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`\n        Gmail 自動取得失敗: ${msg}`);
    }
  }

  console.log(`\n        メール (${email}) を確認してログインリンクをコピーしてください。`);
  const url = await promptUser('        ログインリンクのURL を貼り付けてください:\n        > ');
  if (!url) throw new Error('ログインリンクURL が入力されませんでした');
  return url;
}

// ---- スプレッドシートリポジトリの生成 ----

function createOrderRepository(): SpreadsheetOrderRepository {
  const spreadsheetId = process.env['GOOGLE_SHEETS_SPREADSHEET_ID'];
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません');

  const serviceAccountBase64 = process.env['GOOGLE_SERVICE_ACCOUNT_BASE64'];
  let serviceAccountKey: { client_email: string; private_key: string } | undefined;
  if (serviceAccountBase64) {
    const json = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'),
    ) as Record<string, unknown>;
    if (typeof json.client_email === 'string' && typeof json.private_key === 'string') {
      serviceAccountKey = { client_email: json.client_email, private_key: json.private_key };
    }
  }

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: process.env['GOOGLE_SHEETS_SHEET_NAME'] ?? 'Orders',
    serviceAccountKey,
    accessToken: process.env['GOOGLE_SHEETS_ACCESS_TOKEN'],
    refreshToken: process.env['GOOGLE_SHEETS_REFRESH_TOKEN'],
    clientId: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  });

  return new SpreadsheetOrderRepository(sheetsClient);
}

// ---- メイン ----

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), '.env.local'));

  const email = process.env['MINNE_EMAIL'];
  if (!email) {
    console.error('エラー: MINNE_EMAIL が設定されていません');
    process.exit(1);
  }

  const orderRepository = createOrderRepository();
  const orderFactory = new OrderFactory();

  console.log('[batch-fetch] ブラウザを起動しています...');
  const browser = await chromium.launch({ headless: false });
  try {
    const page = await browser.newPage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const minnePage = new MinnePage(page as any);

    // Step 1: ログインリンクを送信
    console.log(`\n[Step 1] ログインリンクを送信中 (${email})...`);
    const sentAt = new Date();
    await minnePage.sendLoginLink(email);

    // Step 2: Gmail からログインリンクを取得
    console.log('\n[Step 2] Gmail からログインリンクを自動取得中...');
    const loginUrl = await fetchLoginUrl(sentAt, email);

    // Step 3: セッション確立
    console.log('\n[Step 3] ログインリンクを開いてセッションを確立中...');
    await minnePage.openLoginLink(loginUrl);
    console.log('        → ログイン完了');

    // Step 4: Gmail の未読 minne 購入通知メールから注文 ID を取得
    console.log('\n[Step 4] Gmail の未読注文メールから注文 ID を取得中...');
    const gmailClient = new GoogleGmailClient({
      accessToken: process.env['GMAIL_ACCESS_TOKEN'],
      refreshToken: process.env['GMAIL_REFRESH_TOKEN'],
      clientId: process.env['GOOGLE_CLIENT_ID'],
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    });

    const unreadEmails = await gmailClient.fetchUnreadMinneOrderEmails();
    if (unreadEmails.length === 0) {
      console.log('        → 未読の購入通知メールはありません');
      return;
    }
    console.log(
      `        → ${unreadEmails.length} 件の未読メールを検出: ` +
        unreadEmails.map((e) => e.orderId).join(', '),
    );

    // Step 5: 未登録の注文だけ処理
    console.log('\n[Step 5] スプシ未登録の注文を取得・保存中...');
    const result = { saved: 0, skipped: 0, failed: 0 };
    const errors: string[] = [];

    for (const email of unreadEmails) {
      const { orderId, messageId } = email;
      const orderIdVO = new OrderId(orderId);

      if (await orderRepository.exists(orderIdVO)) {
        console.log(`  [スキップ] ${orderId} - スプシに登録済み`);
        await gmailClient.markAsRead(messageId).catch(() => {
          /* 既読化失敗は無視 */
        });
        result.skipped++;
        continue;
      }

      try {
        // minne から注文詳細を取得
        const fetched = await minnePage.fetchOrderData(orderId);

        // Order ドメインオブジェクトに変換
        const order = orderFactory.createFromPlatformData({
          orderId: fetched.orderId,
          platform: Platform.Minne,
          buyerName: fetched.buyerName,
          buyerPostalCode: fetched.buyerPostalCode,
          buyerPrefecture: fetched.buyerPrefecture,
          buyerCity: fetched.buyerCity,
          buyerAddress1: fetched.buyerAddress1,
          buyerAddress2: fetched.buyerAddress2,
          buyerPhone: fetched.buyerPhone,
          productName: fetched.productName,
          price: fetched.price,
          orderedAt: fetched.orderedAt,
        });

        // スプシに保存
        await orderRepository.save(order);

        // 保存成功 → 既読にマーク
        await gmailClient.markAsRead(messageId).catch(() => {
          /* 既読化失敗は無視 */
        });

        console.log(
          `  [保存]   ${orderId} - ${fetched.buyerName} /` +
            ` ${fetched.productName} / ${fetched.buyerPrefecture}`,
        );
        result.saved++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  [失敗]   ${orderId}: ${msg}`);
        errors.push(`${orderId}: ${msg}`);
        result.failed++;
      }
    }

    // Step 6: 結果サマリー
    console.log('\n===== 処理結果 =====');
    console.log(`  保存:     ${result.saved} 件`);
    console.log(`  スキップ: ${result.skipped} 件（スプシ登録済み）`);
    console.log(`  失敗:     ${result.failed} 件`);
    if (errors.length > 0) {
      console.log('\n  失敗詳細:');
      errors.forEach((e) => console.log(`    - ${e}`));
    }
    console.log('====================\n');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error('[batch-fetch] エラーが発生しました:');
  console.error(error);
  process.exit(1);
});
