/**
 * Gmail アクセストークンを更新するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/refresh-gmail-token.ts
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

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    console.error('❌ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定されていません');
    process.exit(1);
  }

  if (!refreshToken) {
    console.error('❌ GMAIL_REFRESH_TOKEN が設定されていません');
    process.exit(1);
  }

  console.log('🔄 アクセストークンを更新中...\n');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    console.error('❌ トークン更新に失敗しました:', data);
    process.exit(1);
  }

  const newAccessToken = data.access_token as string;

  console.log('✅ 新しいアクセストークンを取得しました\n');
  console.log('以下を .env.local の GMAIL_ACCESS_TOKEN に設定してください:\n');
  console.log(`GMAIL_ACCESS_TOKEN=${newAccessToken}`);

  // .env.local を自動更新
  const envPath = path.resolve(process.cwd(), '.env.local');
  let content = fs.readFileSync(envPath, 'utf-8');

  if (content.includes('GMAIL_ACCESS_TOKEN=')) {
    content = content.replace(/GMAIL_ACCESS_TOKEN=.*/g, `GMAIL_ACCESS_TOKEN=${newAccessToken}`);
  } else {
    content += `\nGMAIL_ACCESS_TOKEN=${newAccessToken}`;
  }

  fs.writeFileSync(envPath, content);
  console.log('\n✅ .env.local を自動更新しました');
}

main().catch(console.error);
