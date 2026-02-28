/**
 * Orders シートの Q1 ヘッダー（クリックポスト内容品）を設定するスクリプト。
 *
 * 使い方:
 *   npx tsx scripts/setup-orders-click-post-item-header.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  GoogleSheetsClient,
  ServiceAccountKey,
} from '../src/infrastructure/external/google/SheetsClient';

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} が設定されていません`);
  return value;
}

function parseServiceAccountKey(base64: string): ServiceAccountKey {
  const json = Buffer.from(base64, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_BASE64 が不正です');
  }
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

function createClient(): GoogleSheetsClient {
  const spreadsheetId = resolveRequired('GOOGLE_SHEETS_SPREADSHEET_ID');
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || 'Orders';
  const serviceAccountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64?.trim();
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  const refreshToken = process.env.GOOGLE_SHEETS_REFRESH_TOKEN?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  const config: ConstructorParameters<typeof GoogleSheetsClient>[0] = {
    spreadsheetId,
    sheetName,
  };

  if (serviceAccountBase64) {
    config.serviceAccountKey = parseServiceAccountKey(serviceAccountBase64);
  } else if (accessToken) {
    config.accessToken = accessToken;
  } else if (refreshToken && clientId && clientSecret) {
    config.refreshToken = refreshToken;
    config.clientId = clientId;
    config.clientSecret = clientSecret;
  } else {
    throw new Error('Google Sheets認証情報が不足しています');
  }

  return new GoogleSheetsClient(config);
}

async function main(): Promise<void> {
  loadEnvLocal();
  const client = createClient();
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || 'Orders';

  await client.writeRows([['click_post_item_name']], `${sheetName}!Q1`);
  console.log(`✅ ${sheetName}!Q1 に click_post_item_name を設定しました`);
}

void main();
