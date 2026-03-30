import type { JobStatus, ProductStatus } from '@/domain/types/status';
import type { SpreadsheetProductRecord } from '@/domain/types/product';

export type AddProductInput = {
  productId: string;
  title: string;
  description: string;
  price: number | null;
  inventory: number | null;
  platforms: string[];
  imageUrls?: string[];
};

export type UpdateProductStatusInput = {
  productId: string;
  syncStatus?: ProductStatus;
  platformStatuses?: Record<string, JobStatus | undefined>;
  clearErrorsForPlatforms?: string[];
  lastSyncedTimestamps?: Record<string, string | null | undefined>;
  note?: string | null;
};

export type UpdateProductInput = {
  productId: string;
  fields: Record<string, string>; // カラムヘッダー名 → 値
};

export interface ProductRepositoryPort {
  listProducts(): Promise<SpreadsheetProductRecord[]>;
  findProductById(productId: string): Promise<SpreadsheetProductRecord | null>;
  updateProductStatuses(input: UpdateProductStatusInput): Promise<void>;
  addProduct(input: AddProductInput): Promise<void>;
  updateProduct(input: UpdateProductInput): Promise<void>;
  addProductRaw(fields: Record<string, string>): Promise<void>;
}
