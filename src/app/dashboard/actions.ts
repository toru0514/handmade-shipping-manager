'use server';

import { revalidatePath } from 'next/cache';
import {
  getDashboardSnapshotUseCase,
  refreshProductsFromSheetsUseCase,
  enqueueDraftUseCase,
  addProductUseCase,
  type DashboardJob,
  type DashboardProduct,
} from '@/application/usecases/ProductDashboardUseCase';
import {
  syncSheetsToDbUseCase,
  type SyncResult,
} from '@/application/usecases/SyncProductsToDbUseCase';
import {
  getProductDetailUseCase,
  updateProductUseCase,
  copyProductUseCase,
} from '@/application/usecases/ProductManagementUseCase';
import type { SpreadsheetProductRecord } from '@/domain/types/product';

export type ProductRow = DashboardProduct;
export type JobRow = DashboardJob;

export async function getDashboardData() {
  return getDashboardSnapshotUseCase();
}

export async function refreshProductsFromSheets(): Promise<SyncResult | null> {
  await refreshProductsFromSheetsUseCase();

  // スプシ読み込みと同時に DB にも同期
  let syncResult: SyncResult | null = null;
  try {
    syncResult = await syncSheetsToDbUseCase();
  } catch {
    // DB 同期失敗はスプシ更新に影響させない
  }

  revalidatePath('/dashboard');
  revalidatePath('/');
  return syncResult;
}

export async function enqueueDraft(productId: string, platforms: string[]) {
  await enqueueDraftUseCase(productId, platforms);
  revalidatePath('/dashboard');
  revalidatePath('/');
}

export async function addProduct(input: unknown) {
  if (
    typeof input !== 'object' ||
    input === null ||
    typeof (input as Record<string, unknown>).productId !== 'string' ||
    typeof (input as Record<string, unknown>).title !== 'string' ||
    !Array.isArray((input as Record<string, unknown>).platforms) ||
    !(input as Record<string, unknown[]>).platforms.every((v: unknown) => typeof v === 'string')
  ) {
    throw new Error('不正な入力です。');
  }

  const raw = input as Record<string, unknown>;
  const price =
    raw.price === null || typeof raw.price === 'number' ? (raw.price as number | null) : null;
  const inventory =
    raw.inventory === null || typeof raw.inventory === 'number'
      ? (raw.inventory as number | null)
      : null;
  const description = typeof raw.description === 'string' ? raw.description : '';

  await addProductUseCase({
    productId: raw.productId as string,
    title: raw.title as string,
    description,
    price,
    inventory,
    platforms: raw.platforms as string[],
  });
  revalidatePath('/dashboard');
  revalidatePath('/');
}

export type ProductDetail = SpreadsheetProductRecord;

export async function getProductDetail(productId: string): Promise<ProductDetail> {
  return getProductDetailUseCase(productId);
}

export async function updateProduct(input: {
  productId: string;
  fields: Record<string, string>;
}): Promise<void> {
  if (
    typeof input !== 'object' ||
    !input ||
    typeof input.productId !== 'string' ||
    typeof input.fields !== 'object' ||
    !input.fields
  ) {
    throw new Error('不正な入力です。');
  }

  await updateProductUseCase(input.productId, input.fields);
  revalidatePath('/dashboard');
  revalidatePath('/');
}

export async function copyProduct(sourceProductId: string): Promise<string> {
  if (typeof sourceProductId !== 'string') {
    throw new Error('不正な入力です。');
  }

  const newId = await copyProductUseCase(sourceProductId);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return newId;
}

/**
 * selectフィールドの選択肢を共通シートの既存データから取得する。
 * キー: カラム名, 値: ユニーク値の配列
 */
export async function getFieldOptions(keys: string[]): Promise<Record<string, string[]>> {
  const { dualWriteProductRepository: googleSheetsProductRepository } =
    await import('@/infrastructure/adapters/persistence/DualWriteProductRepository');
  const products = await googleSheetsProductRepository.listProducts();

  const result: Record<string, string[]> = {};
  for (const key of keys) {
    const values = new Set<string>();
    for (const product of products) {
      const v = (product.raw[key] ?? '').trim();
      if (v) values.add(v);
    }
    result[key] = [...values].sort();
  }
  return result;
}

export type MicroCmsImage = {
  id: string;
  url: string;
  width: number;
  height: number;
};

export async function fetchMicroCmsImages(
  offset: number = 0,
  limit: number = 20,
): Promise<{ images: MicroCmsImage[]; totalCount: number }> {
  const domain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  if (!domain || !apiKey) {
    throw new Error('microCMSの環境変数が設定されていません。');
  }

  const res = await fetch(
    `https://${domain}.microcms-management.io/api/v1/media?limit=${limit}&offset=${offset}`,
    { headers: { 'X-MICROCMS-API-KEY': apiKey }, cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error(`microCMS API エラー: ${res.status}`);
  }
  const data = await res.json();
  return {
    images: (data.media ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      url: m.url as string,
      width: m.width as number,
      height: m.height as number,
    })),
    totalCount: data.totalCount as number,
  };
}

export async function uploadImageToMicroCms(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const domain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  if (!domain || !apiKey) {
    return { error: 'microCMSの環境変数が設定されていません。' };
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return { error: 'ファイルが選択されていません。' };
  }

  const uploadForm = new FormData();
  uploadForm.append('file', file);

  const res = await fetch(`https://${domain}.microcms-management.io/api/v1/media`, {
    method: 'POST',
    headers: { 'X-MICROCMS-API-KEY': apiKey },
    body: uploadForm,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { error: `microCMS APIエラー: ${res.status} ${text}` };
  }

  const data = await res.json();
  return { url: data.url as string };
}

export async function getSpreadsheetUrl(): Promise<string | null> {
  const spreadsheetId = process.env.PRODUCT_SPREADSHEET_ID;
  if (!spreadsheetId) return null;

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
