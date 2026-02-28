/**
 * 購入お礼向け商品名マッピングシートを初期化/追記するスクリプト。
 *
 * 使い方:
 *   npx tsx scripts/setup-purchase-thanks-product-name-map.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  GoogleSheetsClient,
  ServiceAccountKey,
} from '../src/infrastructure/external/google/SheetsClient';

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function resolveRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} が設定されていません`);
  }
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
  const sheetName =
    process.env.GOOGLE_SHEETS_PRODUCT_NAME_MAP_SHEET_NAME?.trim() || 'PurchaseThanksProductNameMap';
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
    throw new Error(
      'Google Sheets認証情報が不足しています（GOOGLE_SERVICE_ACCOUNT_BASE64 などを設定してください）',
    );
  }

  return new GoogleSheetsClient(config);
}

async function main(): Promise<void> {
  loadEnvLocal();
  const client = createClient();
  const sheetName =
    process.env.GOOGLE_SHEETS_PRODUCT_NAME_MAP_SHEET_NAME?.trim() || 'PurchaseThanksProductNameMap';
  const range = `${sheetName}!A1:B`;

  const existing = await client.readRows(range);
  const rows = existing.length > 0 ? existing.map((row) => [...row]) : [];

  if (rows.length === 0) {
    rows.push(['original_product_name', 'purchase_thanks_product_name']);
  }

  const entries: Array<[string, string]> = [
    [
      '金箔×木材コラボ_エボニー_イヤーカフ_銀箔_金箔_木のアクセサリー_ウッドアクセサリー_黒色_金属アレルギー対応',
      'ウッドイヤーカフ_エボニー',
    ],
    [
      'クリスタルウッドリング_カリン_木の指輪_茶色_フルサイズ展開_金属アレルギー対応_ペアリング',
      'クリスタルウッドリング_カリン',
    ],
  ];

  const legacyKeys = new Set([
    '金箔×木材コラボ_エボニー_イヤーカフ_銀箔_金箔_木のアクセサリー_ウッドアクセサリー_黒色_金属アレルギー対応(三角M(金箔))',
    'クリスタルウッドリング_カリン_木の指輪_茶色_フルサイズ展開_金属アレルギー対応_ペアリング(12号)',
  ]);

  const normalizedRows = [rows[0]];
  for (const row of rows.slice(1)) {
    const key = (row[0] ?? '').trim();
    if (!key || legacyKeys.has(key)) {
      continue;
    }
    normalizedRows.push(row);
  }

  const indexByKey = new Map<string, number>();
  for (let i = 1; i < normalizedRows.length; i += 1) {
    const key = (normalizedRows[i]?.[0] ?? '').trim();
    if (key) {
      indexByKey.set(key, i);
    }
  }

  for (const [original, mapped] of entries) {
    const existingIndex = indexByKey.get(original);
    if (existingIndex === undefined) {
      normalizedRows.push([original, mapped]);
      continue;
    }
    normalizedRows[existingIndex] = [original, mapped];
  }

  await client.clearRows(range);
  await client.writeRows(normalizedRows, `${sheetName}!A1`);

  console.log(`✅ ${sheetName} に ${entries.length} 件（重複除外あり）を反映しました`);
}

void main();
