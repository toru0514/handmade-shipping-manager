/**
 * 発送方法ラベルマッピングシートを初期化/追記するスクリプト。
 *
 * 使い方:
 *   npx tsx scripts/setup-shipping-method-label-map.ts
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
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
  const sheetName =
    process.env.GOOGLE_SHEETS_SHIPPING_METHOD_LABEL_SHEET_NAME?.trim() || 'ShippingMethodLabelMap';
  const serviceAccountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64?.trim();
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  const refreshToken = process.env.GOOGLE_SHEETS_REFRESH_TOKEN?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  const baseConfig = { spreadsheetId, sheetName };

  if (serviceAccountBase64) {
    return new GoogleSheetsClient({
      ...baseConfig,
      serviceAccountKey: parseServiceAccountKey(serviceAccountBase64),
    });
  }
  if (accessToken) {
    return new GoogleSheetsClient({
      ...baseConfig,
      accessToken,
    });
  }
  if (refreshToken && clientId && clientSecret) {
    return new GoogleSheetsClient({
      ...baseConfig,
      refreshToken,
      clientId,
      clientSecret,
    });
  } else {
    throw new Error('Google Sheets認証情報が不足しています');
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const client = createClient();
  const sheetName =
    process.env.GOOGLE_SHEETS_SHIPPING_METHOD_LABEL_SHEET_NAME?.trim() || 'ShippingMethodLabelMap';
  const range = `${sheetName}!A1:B`;
  const existing = await client.readRows(range);
  const rows = existing.length > 0 ? existing.map((row) => [...row]) : [];

  if (rows.length === 0) {
    rows.push(['shipping_method_code', 'shipping_method_label']);
  }

  const entries: Array<[string, string]> = [
    ['click_post', 'クリックポスト(日本郵便)'],
    ['yamato_compact', '宅急便コンパクト(ヤマト運輸)'],
  ];

  const indexByKey = new Map<string, number>();
  for (let i = 1; i < rows.length; i += 1) {
    const key = (rows[i]?.[0] ?? '').trim();
    if (key) indexByKey.set(key, i);
  }

  for (const [code, label] of entries) {
    const idx = indexByKey.get(code);
    if (idx === undefined) {
      rows.push([code, label]);
    } else {
      rows[idx] = [code, label];
    }
  }

  await client.clearRows(range);
  await client.writeRows(rows, `${sheetName}!A1`);
  console.log(`✅ ${sheetName} に ${entries.length} 件を反映しました`);
}

void main();
