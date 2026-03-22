/**
 * 伝票発行ジョブを処理するワーカースクリプト。
 *
 * Supabase の shipping_label_jobs テーブルから pending ジョブを取得し、
 * Browserless Cloud 経由で Playwright を実行して伝票を発行する。
 *
 * 使い方:
 *   npx tsx scripts/process-label-jobs.ts
 *   npx tsx scripts/process-label-jobs.ts --once
 *
 * 環境変数:
 *   LABEL_WORKER_INTERVAL_MS   ポーリング間隔（ms, default: 5000 = 5秒）
 *   BROWSERLESS_WS_ENDPOINT    Browserless の WebSocket URL（必須）
 *   NEXT_PUBLIC_SUPABASE_URL   Supabase URL（必須）
 *   SUPABASE_SERVICE_ROLE_KEY  Supabase サービスロールキー（必須）
 *   SLACK_WEBHOOK_URL          Slack 通知 URL（任意）
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createContainer } from '../src/infrastructure/di/container';
import { SupabaseShippingLabelJobRepository } from '../src/infrastructure/adapters/persistence/SupabaseShippingLabelJobRepository';
import type { ShippingLabelJob } from '../src/domain/ports/ShippingLabelJobRepository';

const DEFAULT_INTERVAL_MS = 5_000;

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

function nowIso(): string {
  return new Date().toISOString();
}

function createJobRepository(): SupabaseShippingLabelJobRepository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください');
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return new SupabaseShippingLabelJobRepository(supabase);
}

async function sendSlackNotification(message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (error) {
    console.warn(`[${nowIso()}] [label-worker] Slack 通知に失敗: ${error}`);
  }
}

async function processJob(
  job: ShippingLabelJob,
  jobRepository: SupabaseShippingLabelJobRepository,
): Promise<void> {
  const acquired = await jobRepository.markAsProcessing(job.id);
  if (!acquired) {
    console.log(`[${nowIso()}] [label-worker] job=${job.id} already taken by another worker, skip`);
    return;
  }

  console.log(
    `[${nowIso()}] [label-worker] job=${job.id} orderId=${job.orderId} method=${job.shippingMethod} processing`,
  );

  const startedAt = Date.now();

  try {
    const container = createContainer(process.env);
    const useCase = container.getIssueShippingLabelUseCase();
    const result = await useCase.execute({
      orderId: job.orderId,
      shippingMethod: job.shippingMethod,
    });

    const tookMs = Date.now() - startedAt;

    // pdfData は大きいのでジョブ結果には含めない（Google Sheets に保存済み）
    const jobResult: Record<string, unknown> = {
      orderId: result.orderId,
      labelId: result.labelId,
      shippingMethod: result.shippingMethod,
      labelType: result.labelType,
      status: result.status,
      issuedAt: result.issuedAt,
      expiresAt: result.expiresAt,
      trackingNumber: result.trackingNumber,
      qrCode: result.qrCode,
      waybillNumber: result.waybillNumber,
      warnings: result.warnings,
    };

    await jobRepository.markAsCompleted(job.id, jobResult);

    console.log(
      `[${nowIso()}] [label-worker] job=${job.id} completed labelId=${result.labelId} tookMs=${tookMs}`,
    );

    await sendSlackNotification(
      `✅ 伝票発行完了: 注文 ${job.orderId} (${job.shippingMethod}) — 伝票ID: ${result.labelId}`,
    );
  } catch (error) {
    const tookMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);

    await jobRepository.markAsFailed(job.id, message);

    console.error(`[${nowIso()}] [label-worker] job=${job.id} failed tookMs=${tookMs}: ${message}`);

    await sendSlackNotification(
      `❌ 伝票発行失敗: 注文 ${job.orderId} (${job.shippingMethod}) — ${message}`,
    );
  }
}

async function runOnce(jobRepository: SupabaseShippingLabelJobRepository): Promise<void> {
  const pendingJobs = await jobRepository.findPendingJobs(5);

  if (pendingJobs.length === 0) {
    return;
  }

  console.log(`[${nowIso()}] [label-worker] found ${pendingJobs.length} pending job(s)`);

  // 1件ずつ直列処理（ブラウザリソースの競合を避ける）
  for (const job of pendingJobs) {
    await processJob(job, jobRepository);
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const once = process.argv.includes('--once');
  const intervalMs = (() => {
    const value = process.env.LABEL_WORKER_INTERVAL_MS?.trim();
    if (!value) return DEFAULT_INTERVAL_MS;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_INTERVAL_MS;
  })();

  if (!process.env.BROWSERLESS_WS_ENDPOINT?.trim()) {
    console.error(`[${nowIso()}] [label-worker] BROWSERLESS_WS_ENDPOINT が設定されていません`);
    process.exit(1);
  }

  const jobRepository = createJobRepository();

  console.log(`[${nowIso()}] [label-worker] start once=${once} intervalMs=${intervalMs}`);

  if (once) {
    await runOnce(jobRepository);
    return;
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runOnce(jobRepository);
    } catch (error) {
      console.error(
        `[${nowIso()}] [label-worker] unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      running = false;
    }
  };

  await run();
  setInterval(run, intervalMs);
}

void main();
