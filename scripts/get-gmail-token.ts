/**
 * Gmail API アクセストークン取得スクリプト
 *
 * 使用方法:
 * 1. .env.local に以下を設定:
 *    GOOGLE_CLIENT_ID=your-client-id
 *    GOOGLE_CLIENT_SECRET=your-client-secret
 *
 * 2. 実行:
 *    npx tsx scripts/get-gmail-token.ts
 *
 * 3. 表示されたURLをブラウザで開き、認証後のリダイレクトURLからcodeを取得
 *
 * 4. codeを入力してトークンを取得
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を設定してください');
    process.exit(1);
  }

  // Step 1: 認証URLを生成
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\n1. 以下のURLをブラウザで開いてください:\n');
  console.log(authUrl.toString());
  console.log('\n2. 認証後、リダイレクトされたURLから "code" パラメータをコピーしてください');
  console.log('   例: http://localhost:3000/oauth/callback?code=4/0ABC...\n');

  // Step 2: codeを入力
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('code を入力: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  // Step 3: トークンを取得
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokenData = (await tokenResponse.json()) as Record<string, unknown>;

  if (!tokenResponse.ok) {
    console.error('\nトークン取得に失敗しました:', tokenData);
    process.exit(1);
  }

  console.log('\n=== トークン取得成功 ===\n');
  console.log('以下を .env に追加してください:\n');
  console.log(`GMAIL_ACCESS_TOKEN=${tokenData.access_token}`);
  if (tokenData.refresh_token) {
    console.log(`GMAIL_REFRESH_TOKEN=${tokenData.refresh_token}`);
  }
  console.log('\n注意: access_token は約1時間で期限切れになります。');
  console.log('refresh_token を使用すると自動更新できます。');
}

main().catch(console.error);
