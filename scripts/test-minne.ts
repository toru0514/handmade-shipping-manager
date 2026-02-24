/**
 * MinneAdapter 単体疎通スクリプト（保存はしない）
 *
 * 使用方法:
 *   npx tsx scripts/test-minne.ts MN-00001
 */

import * as fs from 'fs';
import * as path from 'path';
import { MinneAdapter } from '../src/infrastructure/adapters/platform/MinneAdapter';
import { OrderId } from '../src/domain/valueObjects/OrderId';
import { Platform } from '../src/domain/valueObjects/Platform';
import { ChromiumBrowserFactory } from '../src/infrastructure/external/playwright/ChromiumBrowserFactory';

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
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function resolveHeadless(): boolean {
  const value = process.env.PLAYWRIGHT_HEADLESS?.trim().toLowerCase();
  if (!value) {
    return false;
  }
  return value === 'true' || value === '1';
}

function resolveManualLoginWaitMs(): number {
  const value = process.env.MINNE_MANUAL_LOGIN_WAIT_MS?.trim();
  if (!value) {
    return 180_000;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 180_000;
  }
  return parsed;
}

async function main(): Promise<void> {
  loadEnvLocal();

  const orderIdArg = process.argv[2]?.trim();
  if (!orderIdArg) {
    console.error('❌ 注文IDを指定してください。例: npx tsx scripts/test-minne.ts MN-00001');
    process.exit(1);
  }

  const email = process.env.MINNE_EMAIL?.trim();
  const password = process.env.MINNE_PASSWORD?.trim();

  if (!email || !password) {
    console.error('❌ MINNE_EMAIL / MINNE_PASSWORD を .env.local に設定してください');
    process.exit(1);
  }

  console.log('🔍 MinneAdapter で注文取得を開始します...');
  console.log(`   orderId: ${orderIdArg}`);
  console.log(
    `   ログインリンク方式の手動待機: ${Math.round(resolveManualLoginWaitMs() / 1000)} 秒`,
  );

  const adapter = new MinneAdapter({
    browserFactory: new ChromiumBrowserFactory({
      headless: resolveHeadless(),
      ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === 'true',
    }),
    credentials: {
      email,
      password,
      manualLoginWaitMs: resolveManualLoginWaitMs(),
    },
  });

  try {
    const result = await adapter.fetch(new OrderId(orderIdArg), Platform.Minne);
    console.log('\n✅ MinneAdapter 取得成功（保存はしていません）');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ MinneAdapter 取得失敗');
    console.error(error);
    process.exit(1);
  }
}

void main();
