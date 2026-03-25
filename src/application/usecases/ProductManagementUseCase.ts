import { dualWriteProductRepository as googleSheetsProductRepository } from '@/infrastructure/adapters/persistence/DualWriteProductRepository';
import type { SpreadsheetProductRecord } from '@/domain/types/product';

export async function getProductDetailUseCase(
  productId: string,
): Promise<SpreadsheetProductRecord> {
  const record = await googleSheetsProductRepository.findProductById(productId);
  if (!record) {
    throw new Error(`商品 ${productId} が見つかりませんでした。`);
  }
  return record;
}

export async function updateProductUseCase(
  productId: string,
  fields: Record<string, string>,
): Promise<void> {
  const record = await googleSheetsProductRepository.findProductById(productId);
  if (!record) {
    throw new Error(`商品 ${productId} が見つかりませんでした。`);
  }

  if (Object.keys(fields).length === 0) {
    return; // nothing to update
  }

  await googleSheetsProductRepository.updateProduct({ productId, fields });
}

export async function copyProductUseCase(sourceProductId: string): Promise<string> {
  const source = await googleSheetsProductRepository.findProductById(sourceProductId);
  if (!source) {
    throw new Error(`コピー元の商品 ${sourceProductId} が見つかりませんでした。`);
  }

  const newProductId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Copy raw data, override ID and reset statuses
  const newFields = { ...source.raw };

  // Find and replace product_id in raw (could be any alias)
  const productIdKeys = Object.keys(newFields).filter((key) => {
    const lower = key.replace(/[\s\u3000]/g, '').toLowerCase();
    return lower === 'product_id' || lower === 'id' || lower === '商品id';
  });
  for (const key of productIdKeys) {
    newFields[key] = newProductId;
  }

  // Reset status fields
  const statusKeys = Object.keys(newFields).filter((key) => {
    const lower = key.replace(/[\s\u3000]/g, '').toLowerCase();
    return lower === 'sync_status' || lower === 'ステータス';
  });
  for (const key of statusKeys) {
    newFields[key] = 'new';
  }

  // Clear platform status/error/sync fields
  const platformPrefixes = ['creema', 'minne', 'base', 'iichi'];
  for (const [key] of Object.entries(newFields)) {
    const lower = key.replace(/[\s\u3000]/g, '').toLowerCase();
    for (const prefix of platformPrefixes) {
      if (
        lower.startsWith(prefix) &&
        (lower.includes('status') ||
          lower.includes('error') ||
          lower.includes('synced') ||
          lower.includes('started') ||
          lower.includes('duration') ||
          lower.includes('attempt') ||
          lower.includes('retry'))
      ) {
        newFields[key] = '';
      }
    }
  }

  // Clear common sync/error fields
  const clearKeys = Object.keys(newFields).filter((key) => {
    const lower = key.replace(/[\s\u3000]/g, '').toLowerCase();
    return (
      lower === 'last_synced_at' ||
      lower === '最終同期' ||
      lower === 'last_error' ||
      lower === 'エラーメモ' ||
      lower === '最新エラー' ||
      lower === 'notes_internal' ||
      lower === 'メモ' ||
      lower === 'note'
    );
  });
  for (const key of clearKeys) {
    newFields[key] = '';
  }

  await googleSheetsProductRepository.addProductRaw(newFields);
  return newProductId;
}
