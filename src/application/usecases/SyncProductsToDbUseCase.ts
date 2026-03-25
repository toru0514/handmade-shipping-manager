import { googleSheetsProductRepository } from '@/infrastructure/adapters/persistence/GoogleSheetsProductRepository';
import { listWoods } from '@/infrastructure/adapters/persistence/GoogleSheetsWoodRepository';
import {
  upsertProducts,
  removeStaleProducts,
} from '@/infrastructure/adapters/persistence/SupabaseProductRepository';
import {
  upsertWoods,
  removeStaleWoods,
} from '@/infrastructure/adapters/persistence/SupabaseWoodRepository';
import { writeSyncLog } from '@/infrastructure/adapters/persistence/SupabaseSyncLog';
import { isSupabaseEnabled } from '@/lib/supabase/product-client';
import { getLogger } from '@/infrastructure/lib/logger';

const log = getLogger('sync-to-db');

export type SyncResult = {
  products: { inserted: number; updated: number; deleted: number; errors: number };
  woods: { inserted: number; updated: number; deleted: number; errors: number };
};

/**
 * スプシの全データを読み込んで DB に同期する。
 * 「スプシから更新」ボタン押下時に呼ばれる。
 */
export async function syncSheetsToDbUseCase(): Promise<SyncResult> {
  if (!isSupabaseEnabled()) {
    log.info('Supabase が無効のため、DB 同期をスキップします');
    return {
      products: { inserted: 0, updated: 0, deleted: 0, errors: 0 },
      woods: { inserted: 0, updated: 0, deleted: 0, errors: 0 },
    };
  }

  log.info('スプシ → DB 全体同期を開始します');

  // 商品同期
  const productRecords = await googleSheetsProductRepository.listProducts();
  const productResult = await upsertProducts(productRecords);
  const productDeleted = await removeStaleProducts(productRecords.map((r) => r.id));

  // 木材同期
  const woodRecords = await listWoods();
  const woodResult = await upsertWoods(woodRecords);
  const woodDeleted = await removeStaleWoods(woodRecords.map((w) => w.id));

  const result: SyncResult = {
    products: { ...productResult, deleted: productDeleted },
    woods: { ...woodResult, deleted: woodDeleted },
  };

  // 同期ログ記録
  await writeSyncLog({
    sync_type: 'manual_full',
    entity_type: 'product',
    action: 'full_sync',
    status: productResult.errors > 0 ? 'error' : 'success',
    details: result.products as unknown as Record<string, unknown>,
  }).catch(() => {});

  await writeSyncLog({
    sync_type: 'manual_full',
    entity_type: 'wood_material',
    action: 'full_sync',
    status: woodResult.errors > 0 ? 'error' : 'success',
    details: result.woods as unknown as Record<string, unknown>,
  }).catch(() => {});

  log.info('スプシ → DB 全体同期が完了しました', result);
  return result;
}
