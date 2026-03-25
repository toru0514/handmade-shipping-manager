import { googleSheetsProductRepository } from '@/infrastructure/adapters/persistence/GoogleSheetsProductRepository';
import { upsertProduct } from '@/infrastructure/adapters/persistence/SupabaseProductRepository';
import { writeSyncLog } from '@/infrastructure/adapters/persistence/SupabaseSyncLog';
import { isSupabaseEnabled } from '@/lib/supabase/product-client';
import { getLogger } from '@/infrastructure/lib/logger';
import type {
  ProductRepositoryPort,
  AddProductInput,
  UpdateProductInput,
  UpdateProductStatusInput,
} from '@/domain/ports/ProductRepositoryPort';
import type { SpreadsheetProductRecord } from '@/domain/types/product';

const log = getLogger('dual-write-product-repository');

/**
 * Dual Write リポジトリ:
 * - 読み取り: スプシから
 * - 書き込み: スプシ → DB の順（DB失敗はログのみ）
 */
class DualWriteProductRepository implements ProductRepositoryPort {
  async listProducts(): Promise<SpreadsheetProductRecord[]> {
    return googleSheetsProductRepository.listProducts();
  }

  async findProductById(productId: string): Promise<SpreadsheetProductRecord | null> {
    return googleSheetsProductRepository.findProductById(productId);
  }

  async addProduct(input: AddProductInput): Promise<void> {
    // スプシに書き込み
    await googleSheetsProductRepository.addProduct(input);

    // DB にも保存（失敗してもスプシ側は成功扱い）
    if (isSupabaseEnabled()) {
      try {
        const record = await googleSheetsProductRepository.findProductById(input.productId);
        if (record) {
          await upsertProduct(record);
        }
        await writeSyncLog({
          sync_type: 'dual_write',
          entity_type: 'product',
          entity_id: input.productId,
          action: 'create',
          status: 'success',
        });
      } catch (e) {
        log.warn('商品追加の DB バックアップに失敗', { id: input.productId, error: e });
        await writeSyncLog({
          sync_type: 'dual_write',
          entity_type: 'product',
          entity_id: input.productId,
          action: 'create',
          status: 'error',
          error_message: e instanceof Error ? e.message : String(e),
        }).catch(() => {});
      }
    }
  }

  async addProductRaw(fields: Record<string, string>): Promise<void> {
    await googleSheetsProductRepository.addProductRaw(fields);

    // product_id を探して DB にも保存
    if (isSupabaseEnabled()) {
      const productId = fields.product_id || fields.id || fields['商品ID'] || fields['商品id'];
      if (productId) {
        try {
          const record = await googleSheetsProductRepository.findProductById(productId);
          if (record) {
            await upsertProduct(record);
          }
          await writeSyncLog({
            sync_type: 'dual_write',
            entity_type: 'product',
            entity_id: productId,
            action: 'create',
            status: 'success',
          });
        } catch (e) {
          log.warn('商品 Raw 追加の DB バックアップに失敗', { error: e });
        }
      }
    }
  }

  async updateProduct(input: UpdateProductInput): Promise<void> {
    await googleSheetsProductRepository.updateProduct(input);

    if (isSupabaseEnabled()) {
      try {
        const record = await googleSheetsProductRepository.findProductById(input.productId);
        if (record) {
          await upsertProduct(record);
        }
        await writeSyncLog({
          sync_type: 'dual_write',
          entity_type: 'product',
          entity_id: input.productId,
          action: 'update',
          status: 'success',
        });
      } catch (e) {
        log.warn('商品更新の DB バックアップに失敗', {
          id: input.productId,
          error: e,
        });
      }
    }
  }

  async updateProductStatuses(input: UpdateProductStatusInput): Promise<void> {
    await googleSheetsProductRepository.updateProductStatuses(input);

    if (isSupabaseEnabled()) {
      try {
        const record = await googleSheetsProductRepository.findProductById(input.productId);
        if (record) {
          await upsertProduct(record);
        }
      } catch (e) {
        log.warn('ステータス更新の DB バックアップに失敗', {
          id: input.productId,
          error: e,
        });
      }
    }
  }
}

export const dualWriteProductRepository = new DualWriteProductRepository();
