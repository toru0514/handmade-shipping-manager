import { getSupabaseClient } from '@/lib/supabase/product-client';
import { getLogger } from '@/infrastructure/lib/logger';

const log = getLogger('supabase-sync-log');

export type SyncLogEntry = {
  sync_type: 'manual_full' | 'dual_write' | 'app_action';
  entity_type: 'product' | 'wood_material';
  entity_id?: string;
  action: 'create' | 'update' | 'delete' | 'full_sync';
  status: 'success' | 'error';
  details?: Record<string, unknown>;
  error_message?: string;
};

export async function writeSyncLog(entry: SyncLogEntry): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from('sync_logs').insert(entry);

  if (error) {
    log.warn('同期ログの書き込みに失敗しました', { error: error.message });
  }
}
