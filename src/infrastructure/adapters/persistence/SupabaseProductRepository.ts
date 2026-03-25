import { getSupabaseClient } from '@/lib/supabase/product-client';
import { getLogger } from '@/infrastructure/lib/logger';
import type { SpreadsheetProductRecord } from '@/domain/types/product';

const log = getLogger('supabase-product-repository');

function toProductRow(record: SpreadsheetProductRecord) {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    price: record.price,
    inventory: record.inventory,
    tags: record.tags,
    platforms: record.platforms,
    sync_status: record.syncStatus || null,
    last_synced_at: record.lastSyncedAt || null,
    last_error: record.lastError || null,
    raw_data: record.raw,
    platform_snapshots: record.platformSnapshots,
  };
}

/**
 * 商品を DB に upsert する（1件）
 */
export async function upsertProduct(record: SpreadsheetProductRecord): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('products')
    .upsert(toProductRow(record), { onConflict: 'id' });

  if (error) {
    log.warn('商品の DB 保存に失敗しました', { id: record.id, error: error.message });
    throw error;
  }
}

/**
 * 商品を一括 upsert する（スプシ同期用）
 */
export async function upsertProducts(
  records: SpreadsheetProductRecord[],
): Promise<{ inserted: number; updated: number; errors: number }> {
  const client = getSupabaseClient();
  if (!client) return { inserted: 0, updated: 0, errors: 0 };

  // 既存の商品IDを取得して差分判定
  const { data: existingRows } = await client.from('products').select('id');
  const existingIds = new Set((existingRows ?? []).map((r: { id: string }) => r.id));

  const rows = records.map(toProductRow);
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // バッチ upsert (Supabase は配列を受け付ける)
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await client.from('products').upsert(batch, { onConflict: 'id' });

    if (error) {
      log.warn('商品バッチの DB 保存に失敗しました', {
        batch: `${i}-${i + batch.length}`,
        error: error.message,
      });
      errors += batch.length;
    } else {
      for (const row of batch) {
        if (existingIds.has(row.id)) {
          updated++;
        } else {
          inserted++;
        }
      }
    }
  }

  return { inserted, updated, errors };
}

/**
 * DB にあってスプシにない商品を削除する
 */
export async function removeStaleProducts(activeIds: string[]): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const { data: allRows } = await client.from('products').select('id');

  const activeSet = new Set(activeIds);
  const staleIds = (allRows ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id: string) => !activeSet.has(id));

  if (staleIds.length === 0) return 0;

  const { error } = await client.from('products').delete().in('id', staleIds);

  if (error) {
    log.warn('古い商品の削除に失敗しました', { error: error.message });
    return 0;
  }

  return staleIds.length;
}

/**
 * 商品を DB から削除する（1件）
 */
export async function deleteProduct(productId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from('products').delete().eq('id', productId);

  if (error) {
    log.warn('商品の DB 削除に失敗しました', { id: productId, error: error.message });
  }
}
