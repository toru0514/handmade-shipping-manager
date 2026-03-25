/**
 * Browserless Cloud 接続テスト
 * npx tsx scripts/test-browserless.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright-core';

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
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const wsEndpoint = process.env.BROWSERLESS_WS_ENDPOINT;
if (!wsEndpoint) {
  console.error('BROWSERLESS_WS_ENDPOINT is not set');
  process.exit(1);
}

async function main() {
  console.log('=== Browserless Cloud connection test ===');
  console.log(`Endpoint: ${wsEndpoint!.replace(/token=[^&]+/, 'token=***')}`);

  // Test 1: connect method
  console.log('\n--- Test 1: chromium.connect() ---');
  try {
    const browser = await chromium.connect(wsEndpoint!);
    console.log('  Connected successfully');
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    // Simple test
    console.log('  Navigating to https://example.com ...');
    await page.goto('https://example.com');
    console.log('  example.com: OK, title =', await page.title());

    // Yamato test
    console.log('  Navigating to Yamato login page...');
    try {
      await page.goto('https://auth.kms.kuronekoyamato.co.jp/auth/login', { timeout: 15000 });
      console.log('  Yamato: OK, title =', await page.title());
    } catch (e) {
      console.error('  Yamato: FAILED -', (e as Error).message.split('\n')[0]);

      // Retry with HTTP/1.1 workaround
      console.log('  Retrying Yamato with waitUntil: domcontentloaded ...');
      try {
        await page.goto('https://auth.kms.kuronekoyamato.co.jp/auth/login', {
          timeout: 15000,
          waitUntil: 'domcontentloaded',
        });
        console.log('  Yamato (domcontentloaded): OK, title =', await page.title());
      } catch (e2) {
        console.error(
          '  Yamato (domcontentloaded): FAILED -',
          (e2 as Error).message.split('\n')[0],
        );
      }
    }

    await context.close();
    await browser.close();
  } catch (e) {
    console.error('  connect() FAILED:', (e as Error).message.split('\n')[0]);
  }

  // Test 2: connectOverCDP
  console.log('\n--- Test 2: chromium.connectOverCDP() ---');
  const cdpEndpoint = wsEndpoint!.replace('/chromium/playwright', '/chromium');
  console.log(`Endpoint: ${cdpEndpoint.replace(/token=[^&]+/, 'token=***')}`);
  try {
    const browser = await chromium.connectOverCDP(cdpEndpoint);
    console.log('  Connected successfully');
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    console.log('  Navigating to Yamato login page...');
    try {
      await page.goto('https://auth.kms.kuronekoyamato.co.jp/auth/login', { timeout: 15000 });
      console.log('  Yamato: OK, title =', await page.title());
    } catch (e) {
      console.error('  Yamato: FAILED -', (e as Error).message.split('\n')[0]);
    }

    await context.close();
    await browser.close();
  } catch (e) {
    console.error('  connectOverCDP() FAILED:', (e as Error).message.split('\n')[0]);
  }
}

main().catch(console.error);
