/**
 * 未読メール由来の新規注文取得を定期実行する常駐スクリプト。
 *
 * 使い方:
 *   npx tsx scripts/poll-orders.ts
 *   npx tsx scripts/poll-orders.ts --once
 *
 * 環境変数:
 *   ORDER_POLL_INTERVAL_MS   実行間隔（ms, default: 1800000 = 30分）
 *   ORDER_POLL_WITHIN_DAYS   Gmail検索対象日数（default: 30）
 *   ORDER_POLL_PLATFORMS     対象PF（カンマ区切り, default: "minne,creema"）
 */

import * as fs from 'fs';
import * as path from 'path';
import { createContainer } from '../src/infrastructure/di/container';

type Platform = 'minne' | 'creema';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_WITHIN_DAYS = 30;

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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function resolvePlatforms(): Platform[] {
  const raw = process.env.ORDER_POLL_PLATFORMS?.trim();
  if (!raw) return ['minne', 'creema'];

  const values = raw
    .split(',')
    .map((v) => v.trim())
    .filter((v): v is Platform => v === 'minne' || v === 'creema');

  if (values.length === 0) return ['minne', 'creema'];
  return [...new Set(values)];
}

function nowIso(): string {
  return new Date().toISOString();
}

async function runOnce(platforms: Platform[], withinDays: number): Promise<void> {
  const container = createContainer(process.env);

  for (const platform of platforms) {
    const startedAt = Date.now();
    try {
      const useCase = container.getFetchNewOrdersUseCase(platform);
      const result = await useCase.execute({ platform, withinDays });
      const tookMs = Date.now() - startedAt;
      console.log(
        `[${nowIso()}] [poll] platform=${platform} fetched=${result.fetched} skipped=${result.skipped} errors=${result.errors.length} tookMs=${tookMs}`,
      );
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.warn(
            `[${nowIso()}] [poll] platform=${platform} orderId=${error.orderId} reason=${error.reason}`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${nowIso()}] [poll] platform=${platform} failed: ${message}`);
    }
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const once = process.argv.includes('--once');
  const intervalMs = parsePositiveInt(process.env.ORDER_POLL_INTERVAL_MS, DEFAULT_INTERVAL_MS);
  const withinDays = parsePositiveInt(process.env.ORDER_POLL_WITHIN_DAYS, DEFAULT_WITHIN_DAYS);
  const platforms = resolvePlatforms();

  console.log(
    `[${nowIso()}] [poll] start once=${once} intervalMs=${intervalMs} withinDays=${withinDays} platforms=${platforms.join(',')}`,
  );

  if (once) {
    await runOnce(platforms, withinDays);
    return;
  }

  let running = false;
  const run = async () => {
    if (running) {
      console.warn(`[${nowIso()}] [poll] previous cycle still running; skip this tick`);
      return;
    }
    running = true;
    try {
      await runOnce(platforms, withinDays);
    } finally {
      running = false;
    }
  };

  await run();
  setInterval(run, intervalMs);
}

void main();
