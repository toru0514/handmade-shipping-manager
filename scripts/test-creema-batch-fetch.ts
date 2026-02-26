/**
 * creema 未登録注文の一括取得 → スプレッドシート保存スクリプト
 *
 * 実行方法:
 *   npx tsx scripts/test-creema-batch-fetch.ts
 *
 * フロー:
 *   1. Gmail の未読 creema 購入通知メールから注文 ID を取得
 *   2. スプシ未登録の注文だけを creema から取得
 *   3. OrderFactory で Order に変換してスプシに保存
 *   4. 処理結果を表示（markAsRead 失敗は警告のみ）
 *
 * .env.local から以下を自動読み込み:
 *   CREEMA_EMAIL, CREEMA_PASSWORD,
 *   GMAIL_ACCESS_TOKEN / GMAIL_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *   GOOGLE_SERVICE_ACCOUNT_BASE64, GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_SHEET_NAME
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OrderFactory } from '../src/domain/factories/OrderFactory';
import { OrderId } from '../src/domain/valueObjects/OrderId';
import { Platform } from '../src/domain/valueObjects/Platform';
import { CreemaAdapter } from '../src/infrastructure/adapters/platform/CreemaAdapter';
import { SpreadsheetOrderRepository } from '../src/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { GoogleGmailClient } from '../src/infrastructure/external/google/GmailClient';
import { GoogleSheetsClient } from '../src/infrastructure/external/google/SheetsClient';
import { ChromiumBrowserFactory } from '../src/infrastructure/external/playwright/ChromiumBrowserFactory';

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

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return defaultValue;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

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

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  const debug = parseBoolean(process.env['CREEMA_DEBUG'], false);
  if (debug) {
    console.log('[creema-batch] CREEMA_DEBUG=true (詳細ログ有効)');
  }

  const creemaEmail = process.env['CREEMA_EMAIL']?.trim();
  const creemaPassword = process.env['CREEMA_PASSWORD']?.trim();
  if (!creemaEmail || !creemaPassword) {
    throw new Error('CREEMA_EMAIL / CREEMA_PASSWORD が設定されていません');
  }

  const gmailClient = new GoogleGmailClient({
    accessToken: process.env['GMAIL_ACCESS_TOKEN'],
    refreshToken: process.env['GMAIL_REFRESH_TOKEN'],
    clientId: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  });

  const orderRepository = createOrderRepository();
  const orderFactory = new OrderFactory();
  const browserFactory = new ChromiumBrowserFactory({
    headless: parseBoolean(process.env['PLAYWRIGHT_HEADLESS'], false),
    timeoutMs: parsePositiveInt(process.env['PLAYWRIGHT_LAUNCH_TIMEOUT_MS']),
    ignoreHTTPSErrors: parseBoolean(process.env['PLAYWRIGHT_IGNORE_HTTPS_ERRORS'], false),
  });
  const creemaAdapter = new CreemaAdapter({
    browserFactory,
    credentials: { email: creemaEmail, password: creemaPassword },
  });

  console.log('[creema-batch] Gmail 未読メールから creema 注文IDを取得中...');
  const unreadEmails = await gmailClient.fetchUnreadCreemaOrderEmails();
  if (unreadEmails.length === 0) {
    console.log('  -> 未読の creema 購入通知メールはありません');
    return;
  }
  console.log(`  -> ${unreadEmails.length} 件: ${unreadEmails.map((e) => e.orderId).join(', ')}`);

  const result = { saved: 0, skipped: 0, failed: 0 };
  const errors: string[] = [];

  for (const email of unreadEmails) {
    const startedAt = Date.now();
    const orderId = new OrderId(email.orderId);
    console.log(`\n[creema-batch] 注文処理開始: ${email.orderId}`);

    if (await orderRepository.exists(orderId)) {
      console.log(`  [スキップ] ${email.orderId} - スプシに登録済み`);
      await gmailClient.markAsRead(email.messageId).catch((err) => {
        console.warn(`  [警告] markAsRead失敗: ${email.messageId}`, err);
      });
      result.skipped++;
      continue;
    }

    try {
      console.log(`  [進行] creema 取得中: ${email.orderId}`);
      const fetched = await creemaAdapter.fetch(orderId, Platform.Creema);
      console.log(`  [進行] Order変換・保存中: ${email.orderId}`);
      const order = orderFactory.createFromPlatformData(fetched);
      await orderRepository.save(order);

      await gmailClient.markAsRead(email.messageId).catch((err) => {
        console.warn(`  [警告] markAsRead失敗: ${email.messageId}`, err);
      });

      console.log(`  [保存]   ${email.orderId} - ${fetched.buyerName} / ${fetched.productName}`);
      console.log(`  [時間]   ${email.orderId} - ${Date.now() - startedAt}ms`);
      result.saved++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [失敗]   ${email.orderId}: ${msg}`);
      console.error(`  [時間]   ${email.orderId} - ${Date.now() - startedAt}ms`);
      errors.push(`${email.orderId}: ${msg}`);
      result.failed++;
    }
  }

  console.log('\n===== 処理結果 =====');
  console.log(`  保存:     ${result.saved} 件`);
  console.log(`  スキップ: ${result.skipped} 件`);
  console.log(`  失敗:     ${result.failed} 件`);
  if (errors.length > 0) {
    console.log('\n  失敗詳細:');
    for (const error of errors) {
      console.log(`    - ${error}`);
    }
  }
  console.log('====================\n');
}

main().catch((error: unknown) => {
  console.error('[creema-batch] エラーが発生しました');
  console.error(error);
  process.exit(1);
});
