import type { JobStatus, ProductStatus } from './status';

export type ProductPlatform = 'creema' | 'minne' | string;

export type PlatformJobSnapshot = {
  platform: ProductPlatform;
  status: JobStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  lastJobStartedAt: string | null;
  lastDurationSeconds: number | null;
  attemptCount: number | null;
};

export type SpreadsheetProductRecord = {
  rowNumber: number;
  id: string;
  title: string;
  description: string;
  price: number | null;
  inventory: number | null;
  tags: string[];
  platforms: ProductPlatform[];
  syncStatus: ProductStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  platformSnapshots: PlatformJobSnapshot[];
  raw: Record<string, string>;
};
