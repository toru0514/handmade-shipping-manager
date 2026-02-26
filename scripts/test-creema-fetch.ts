/**
 * creema 購入者情報取得の動作テストスクリプト
 *
 * 実行方法:
 *   npx tsx scripts/test-creema-fetch.ts <注文ID>
 *
 * .env.local から以下を読み込みます:
 *   CREEMA_EMAIL, CREEMA_PASSWORD,
 *   PLAYWRIGHT_HEADLESS, PLAYWRIGHT_LAUNCH_TIMEOUT_MS, PLAYWRIGHT_IGNORE_HTTPS_ERRORS
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CreemaAdapter } from '../src/infrastructure/adapters/platform/CreemaAdapter';
import { ChromiumBrowserFactory } from '../src/infrastructure/external/playwright/ChromiumBrowserFactory';
import { OrderId } from '../src/domain/valueObjects/OrderId';
import { Platform } from '../src/domain/valueObjects/Platform';

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

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), '.env.local'));

  const orderIdArg = process.argv[2]?.trim();
  if (!orderIdArg) {
    console.error('エラー: 注文IDを引数で指定してください');
    console.error('使用方法: npx tsx scripts/test-creema-fetch.ts <注文ID>');
    process.exit(1);
  }

  const email = process.env['CREEMA_EMAIL']?.trim();
  const password = process.env['CREEMA_PASSWORD']?.trim();

  if (!email || !password) {
    console.error('エラー: CREEMA_EMAIL / CREEMA_PASSWORD を .env.local に設定してください');
    process.exit(1);
  }

  const browserFactory = new ChromiumBrowserFactory({
    headless: parseBoolean(process.env['PLAYWRIGHT_HEADLESS'], false),
    timeoutMs: parsePositiveInt(process.env['PLAYWRIGHT_LAUNCH_TIMEOUT_MS']),
    ignoreHTTPSErrors: parseBoolean(process.env['PLAYWRIGHT_IGNORE_HTTPS_ERRORS'], false),
  });

  const adapter = new CreemaAdapter({
    browserFactory,
    credentials: {
      email,
      password,
    },
  });

  console.log(`[test-creema-fetch] 注文ID: ${orderIdArg}`);
  console.log('[test-creema-fetch] creema から注文情報を取得します...');

  const result = await adapter.fetch(new OrderId(orderIdArg), Platform.Creema);

  console.log('\n===== 取得結果 =====');
  console.log(JSON.stringify(result, null, 2));
  console.log('====================\n');
}

main().catch((error: unknown) => {
  console.error('[test-creema-fetch] エラーが発生しました');
  console.error(error);
  process.exit(1);
});
