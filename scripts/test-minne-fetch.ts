/**
 * minne 購入者情報取得の動作テストスクリプト
 *
 * 実行方法:
 *   npx tsx scripts/test-minne-fetch.ts <注文ID>
 *
 * フロー:
 *   1. minne ログインページでメールアドレスを入力し「ログインリンクを送信」
 *   2. Gmail API でログインリンクメールを自動取得（最大60秒ポーリング）
 *      ※ 取得できなかった場合はターミナルで URL を手動入力
 *   3. Playwright ブラウザがリンクを開いてセッション確立
 *   4. 注文詳細ページから購入者情報を取得して表示
 *
 * .env.local から以下を自動読み込みします:
 *   MINNE_EMAIL, GMAIL_ACCESS_TOKEN, GMAIL_REFRESH_TOKEN,
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MinnePage } from '../src/infrastructure/external/playwright/MinnePage';
import { GoogleGmailClient } from '../src/infrastructure/external/google/GmailClient';

// .env.local を手動パースして process.env に設定する（Next.js 外での実行用）
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function promptUser(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), '.env.local'));

  const orderId = process.argv[2];
  if (!orderId) {
    console.error('エラー: 注文IDを引数で指定してください');
    console.error('使用方法: npx tsx scripts/test-minne-fetch.ts <注文ID>');
    process.exit(1);
  }

  const email = process.env['MINNE_EMAIL'];
  if (!email) {
    console.error('エラー: MINNE_EMAIL が設定されていません');
    process.exit(1);
  }

  console.log(`[test-minne-fetch] 注文ID: ${orderId}`);
  console.log('[test-minne-fetch] ブラウザを起動しています (headless=false)...');

  const browser = await chromium.launch({ headless: false });
  try {
    const page = await browser.newPage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const minnePage = new MinnePage(page as any);

    // Step 1: ログインリンクを送信
    console.log(`\n[Step 1] ログインリンクを送信中 (${email})...`);
    const sentAt = new Date();
    await minnePage.sendLoginLink(email);
    console.log('        → 送信完了');

    // Step 2: Gmail からログインリンクを自動取得（失敗時は手動入力にフォールバック）
    const loginUrl = await fetchLoginUrl(sentAt, email);

    // Step 3: Playwright ブラウザでログインリンクを開いてセッション確立
    console.log('\n[Step 3] ログインリンクを開いてセッションを確立中...');
    await minnePage.openLoginLink(loginUrl);
    console.log('        → ログイン完了');

    // Step 4: 注文詳細ページから購入者情報を取得
    console.log(`\n[Step 4] 注文詳細ページから購入者情報を取得中 (ID: ${orderId})...`);
    const result = await minnePage.fetchOrderData(orderId);

    console.log('\n===== 取得結果 =====');
    console.log(JSON.stringify(result, null, 2));
    console.log('====================\n');

    console.log('[test-minne-fetch] 完了');
  } finally {
    await browser.close();
  }
}

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
    console.log('\n[Step 2] Gmail からログインリンクを自動取得中...');
    console.log('         (最大60秒ポーリング。メールが届くまでお待ちください)');
    try {
      const url = await gmailClient.fetchMinneMagicLink(sentAt, {
        intervalMs: 3_000,
        timeoutMs: 60_000,
      });
      console.log('        → ログインリンク取得成功');
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`\n[Step 2] Gmail 自動取得に失敗しました: ${msg}`);
      console.warn('         手動入力にフォールバックします。');
    }
  } else {
    console.log('\n[Step 2] Gmail 認証情報が未設定のため手動入力モードで続行します。');
    console.log(
      `         (.env.local に GMAIL_REFRESH_TOKEN / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を設定すると自動化できます)`,
    );
  }

  // フォールバック: 手動入力
  console.log(`\n        メール (${email}) を確認してログインリンクをコピーしてください。`);
  const url = await promptUser('        ログインリンクのURL を貼り付けてください:\n        > ');
  if (!url) throw new Error('ログインリンクURL が入力されませんでした');
  return url;
}

main().catch((error: unknown) => {
  console.error('[test-minne-fetch] エラーが発生しました:');
  console.error(error);
  process.exit(1);
});
