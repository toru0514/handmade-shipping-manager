import * as sheetsWoodRepo from '@/infrastructure/adapters/persistence/GoogleSheetsWoodRepository';
import {
  upsertWood,
  deleteWoodFromDb,
} from '@/infrastructure/adapters/persistence/SupabaseWoodRepository';
import { writeSyncLog } from '@/infrastructure/adapters/persistence/SupabaseSyncLog';
import { isSupabaseEnabled } from '@/lib/supabase/product-client';
import { getLogger } from '@/infrastructure/lib/logger';
import type { WoodMaterial } from '@/infrastructure/adapters/persistence/GoogleSheetsWoodRepository';

const log = getLogger('dual-write-wood-repository');

export async function listWoods(): Promise<WoodMaterial[]> {
  return sheetsWoodRepo.listWoods();
}

export async function findWoodById(woodId: string): Promise<WoodMaterial | null> {
  return sheetsWoodRepo.findWoodById(woodId);
}

export async function addWood(input: {
  name: string;
  imageUrl: string;
  features: string;
}): Promise<WoodMaterial> {
  const result = await sheetsWoodRepo.addWood(input);

  if (isSupabaseEnabled()) {
    try {
      await upsertWood(result);
      await writeSyncLog({
        sync_type: 'dual_write',
        entity_type: 'wood_material',
        entity_id: result.id,
        action: 'create',
        status: 'success',
      });
    } catch (e) {
      log.warn('木材追加の DB バックアップに失敗', { id: result.id, error: e });
    }
  }

  return result;
}

export async function updateWood(
  woodId: string,
  input: { name: string; imageUrl: string; features: string },
): Promise<WoodMaterial> {
  const result = await sheetsWoodRepo.updateWood(woodId, input);

  if (isSupabaseEnabled()) {
    try {
      await upsertWood(result);
      await writeSyncLog({
        sync_type: 'dual_write',
        entity_type: 'wood_material',
        entity_id: woodId,
        action: 'update',
        status: 'success',
      });
    } catch (e) {
      log.warn('木材更新の DB バックアップに失敗', { id: woodId, error: e });
    }
  }

  return result;
}

export async function deleteWood(woodId: string): Promise<void> {
  await sheetsWoodRepo.deleteWood(woodId);

  if (isSupabaseEnabled()) {
    try {
      await deleteWoodFromDb(woodId);
      await writeSyncLog({
        sync_type: 'dual_write',
        entity_type: 'wood_material',
        entity_id: woodId,
        action: 'delete',
        status: 'success',
      });
    } catch (e) {
      log.warn('木材削除の DB バックアップに失敗', { id: woodId, error: e });
    }
  }
}
