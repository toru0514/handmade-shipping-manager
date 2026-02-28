/**
 * Gmail 連携テストスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/test-gmail.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// .env.local を読み込む
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          const value = trimmed.slice(eqIndex + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnvLocal();

import { GmailClient } from '../src/infrastructure/external/google/GmailClient';

async function main() {
  const accessToken = process.env.GMAIL_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('❌ GMAIL_ACCESS_TOKEN が .env.local に設定されていません');
    process.exit(1);
  }

  console.log('📧 Gmail API に接続中...\n');

  const client = new GmailClient({ accessToken });

  try {
    // 購入通知メールを取得（1ヶ月以内）
    const query = 'newer_than:30d (from:order@minne.com OR from:info@creema.jp)';
    const notifications = await client.listUnreadPurchaseNotifications(query);

    if (notifications.length === 0) {
      console.log('📭 購入通知メールは見つかりませんでした');
      console.log(`\n検索条件: ${query}`);
      console.log(
        '\nヒント: order@minne.com / info@creema.jp のメールが過去30日以内にあるか確認してください',
      );
    } else {
      console.log(`📬 ${notifications.length} 件の購入通知を検出しました:\n`);

      for (const notification of notifications) {
        console.log('---');
        console.log(`  プラットフォーム: ${notification.platform}`);
        console.log(`  注文ID: ${notification.orderId}`);
        console.log(`  件名: ${notification.subject}`);
        console.log(
          `  受信日時: ${notification.receivedAt ? new Date(Number(notification.receivedAt)).toLocaleString('ja-JP') : '不明'}`,
        );
      }
      console.log('---');
    }

    console.log('\n✅ Gmail 連携は正常に動作しています！');
  } catch (error) {
    console.error('❌ Gmail API エラー:', error);
    process.exit(1);
  }
}

main();
