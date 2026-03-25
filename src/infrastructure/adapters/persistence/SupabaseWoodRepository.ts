import { getSupabaseClient } from '@/lib/supabase/product-client';
import { getLogger } from '@/infrastructure/lib/logger';
import type { WoodMaterial } from '@/infrastructure/adapters/persistence/GoogleSheetsWoodRepository';

const log = getLogger('supabase-wood-repository');

function toWoodRow(wood: WoodMaterial) {
  return {
    id: wood.id,
    name: wood.name,
    image_url: wood.imageUrl,
    features: wood.features,
    created_at: wood.createdAt || new Date().toISOString(),
  };
}

/**
 * 木材を DB に upsert する（1件）
 */
export async function upsertWood(wood: WoodMaterial): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('wood_materials')
    .upsert(toWoodRow(wood), { onConflict: 'id' });

  if (error) {
    log.warn('木材の DB 保存に失敗しました', { id: wood.id, error: error.message });
    throw error;
  }
}

/**
 * 木材を一括 upsert する（スプシ同期用）
 */
export async function upsertWoods(
  woods: WoodMaterial[],
): Promise<{ inserted: number; updated: number; errors: number }> {
  const client = getSupabaseClient();
  if (!client) return { inserted: 0, updated: 0, errors: 0 };

  const { data: existingRows } = await client.from('wood_materials').select('id');
  const existingIds = new Set((existingRows ?? []).map((r: { id: string }) => r.id));

  const rows = woods.map(toWoodRow);
  const { error } = await client.from('wood_materials').upsert(rows, { onConflict: 'id' });

  if (error) {
    log.warn('木材バッチの DB 保存に失敗しました', { error: error.message });
    return { inserted: 0, updated: 0, errors: rows.length };
  }

  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    if (existingIds.has(row.id)) {
      updated++;
    } else {
      inserted++;
    }
  }

  return { inserted, updated, errors: 0 };
}

/**
 * DB にあってスプシにない木材を削除する
 */
export async function removeStaleWoods(activeIds: string[]): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;

  const { data: allRows } = await client.from('wood_materials').select('id');

  const activeSet = new Set(activeIds);
  const staleIds = (allRows ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id: string) => !activeSet.has(id));

  if (staleIds.length === 0) return 0;

  const { error } = await client.from('wood_materials').delete().in('id', staleIds);

  if (error) {
    log.warn('古い木材の削除に失敗しました', { error: error.message });
    return 0;
  }

  return staleIds.length;
}

/**
 * 木材を DB から削除する（1件）
 */
export async function deleteWoodFromDb(woodId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from('wood_materials').delete().eq('id', woodId);

  if (error) {
    log.warn('木材の DB 削除に失敗しました', { id: woodId, error: error.message });
  }
}
