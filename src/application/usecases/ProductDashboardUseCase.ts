import { dualWriteProductRepository as googleSheetsProductRepository } from '@/infrastructure/adapters/persistence/DualWriteProductRepository';
import type { SpreadsheetProductRecord } from '@/domain/types/product';
import type { JobStatus, ProductStatus } from '@/domain/types/status';

/** スプレッドシートの raw カラム名 */
const RAW_COLUMN_IMAGE_URLS = 'image_urls';

export type DashboardProduct = {
  id: string;
  title: string;
  platforms: string[];
  status: ProductStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  price: number | null;
  inventory: number | null;
  tags: string[];
  description: string;
  imageUrl: string | null;
};

export type DashboardJob = {
  id: string;
  productId: string;
  platform: string;
  status: JobStatus;
  attempt: number | null;
  startedAt: string | null;
  durationSeconds: number | null;
  lastError: string | null;
};

export async function getDashboardSnapshotUseCase(): Promise<{
  products: DashboardProduct[];
  jobs: DashboardJob[];
}> {
  const records = await googleSheetsProductRepository.listProducts();

  const products = records.map(mapRecordToDashboardProduct);
  const jobs = buildJobsFromRecords(records);

  return {
    products,
    jobs,
  };
}

export async function refreshProductsFromSheetsUseCase(): Promise<void> {
  await googleSheetsProductRepository.listProducts();
}

export async function enqueueDraftUseCase(productId: string, platforms: string[]): Promise<void> {
  const record = await googleSheetsProductRepository.findProductById(productId);
  if (!record) {
    throw new Error(`Product ${productId} がスプレッドシートに存在しません。`);
  }

  const normalizedPlatforms = platforms
    .map((platform) => platform.trim().toLowerCase())
    .filter((platform) => platform.length > 0);

  if (!normalizedPlatforms.length) {
    throw new Error('送信対象のプラットフォームが指定されていません。');
  }

  await googleSheetsProductRepository.updateProductStatuses({
    productId,
    syncStatus: 'queued',
    platformStatuses: Object.fromEntries(
      normalizedPlatforms.map((platform) => [platform, 'queued'] as const),
    ),
    clearErrorsForPlatforms: normalizedPlatforms,
  });
}

export async function addProductUseCase(input: {
  productId: string;
  title: string;
  description: string;
  price: number | null;
  inventory: number | null;
  platforms: string[];
  imageUrls?: string[];
}): Promise<void> {
  if (!input.productId.trim()) {
    throw new Error('商品IDは必須です。');
  }
  if (!input.title.trim()) {
    throw new Error('商品名は必須です。');
  }

  const normalizedPlatforms = input.platforms.map((p) => p.trim().toLowerCase()).filter(Boolean);

  if (!normalizedPlatforms.length) {
    throw new Error('出品先を1つ以上選択してください。');
  }

  const existing = await googleSheetsProductRepository.findProductById(input.productId.trim());
  if (existing) {
    throw new Error(`商品ID "${input.productId}" は既に存在します。`);
  }

  await googleSheetsProductRepository.addProduct({
    productId: input.productId.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    inventory: input.inventory,
    platforms: normalizedPlatforms,
    imageUrls: input.imageUrls,
  });
}

function mapRecordToDashboardProduct(record: SpreadsheetProductRecord): DashboardProduct {
  const productTitle = record.title || '(タイトル未設定)';
  const lastSyncedAt =
    record.lastSyncedAt ??
    pickLatestDate(
      record.platformSnapshots
        .map((snapshot) => snapshot.lastSyncedAt)
        .filter((value): value is string => Boolean(value)),
    );

  const lastError =
    record.lastError ??
    pickFirstNonEmpty(
      record.platformSnapshots
        .map((snapshot) => snapshot.lastError)
        .filter((value): value is string => Boolean(value)),
    );

  const rawImageUrls = record.raw[RAW_COLUMN_IMAGE_URLS] ?? '';
  const firstImageUrl =
    rawImageUrls
      .split(/[,\n]/)
      .map((u) => u.trim())
      .find((u) => u.length > 0) ?? null;

  return {
    id: record.id,
    title: productTitle,
    platforms: record.platforms,
    status: record.syncStatus,
    lastSyncedAt: lastSyncedAt ?? null,
    lastError: lastError ?? null,
    price: record.price,
    inventory: record.inventory,
    tags: record.tags,
    description: record.description,
    imageUrl: firstImageUrl,
  };
}

function buildJobsFromRecords(records: SpreadsheetProductRecord[]): DashboardJob[] {
  const jobs: DashboardJob[] = [];

  for (const record of records) {
    const declaredPlatforms = new Set(record.platforms.map((platform) => platform.toLowerCase()));
    const snapshotPlatforms = new Set(
      record.platformSnapshots.map((snapshot) => snapshot.platform.toLowerCase()),
    );

    const allPlatforms = new Set<string>([...declaredPlatforms, ...snapshotPlatforms]);

    for (const platform of allPlatforms) {
      const snapshot = record.platformSnapshots.find(
        (item) => item.platform.toLowerCase() === platform,
      );
      const status = snapshot?.status ?? inferJobStatusFromProduct(record);
      const startedAt = snapshot?.lastJobStartedAt ?? snapshot?.lastSyncedAt ?? null;
      const durationSeconds = snapshot?.lastDurationSeconds ?? null;
      const attempt = snapshot?.attemptCount ?? null;
      const lastError = snapshot?.lastError ?? null;

      jobs.push({
        id: `${record.id}:${platform}`,
        productId: record.id,
        platform,
        status,
        attempt,
        startedAt,
        durationSeconds,
        lastError,
      });
    }
  }

  return jobs;
}

function inferJobStatusFromProduct(record: SpreadsheetProductRecord): JobStatus {
  const statusMap: Record<ProductStatus, JobStatus> = {
    new: 'queued',
    ready: 'queued',
    queued: 'queued',
    processing: 'processing',
    drafted: 'success',
    error: 'error',
    skipped: 'skipped',
  };
  return statusMap[record.syncStatus];
}

function pickLatestDate(values: string[]): string | undefined {
  if (!values.length) return undefined;
  return values
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time)[0]?.value;
}

function pickFirstNonEmpty(values: string[]): string | undefined {
  return values.find((value) => value && value.trim().length > 0);
}
