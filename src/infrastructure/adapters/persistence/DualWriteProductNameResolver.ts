import { ProductNameResolver } from '@/domain/ports/ProductNameResolver';
import { SpreadsheetProductNameResolver } from '@/infrastructure/adapters/persistence/SpreadsheetProductNameResolver';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase/product-client';
import { getLogger } from '@/infrastructure/lib/logger';

const log = getLogger('dual-write-product-name-resolver');

/**
 * スプシの ProductNameMap を読み込んだ際に、DB にも同期する ProductNameResolver。
 * - 解決ロジックはスプシ版と同じ（SpreadsheetProductNameResolver に委譲）
 * - 初回読み込み時に全マッピングを DB に upsert する
 */
export class DualWriteProductNameResolver implements ProductNameResolver {
  private synced = false;

  constructor(private readonly spreadsheetResolver: SpreadsheetProductNameResolver) {}

  async resolve(originalProductName: string): Promise<string> {
    if (!this.synced) {
      await this.syncToDb();
      this.synced = true;
    }
    return this.spreadsheetResolver.resolve(originalProductName);
  }

  /**
   * スプシの ProductNameMap を DB に同期する（外部から明示的に呼べる公開メソッド）。
   */
  async syncToDb(): Promise<void> {
    if (!isSupabaseEnabled()) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const rows = await this.spreadsheetResolver.getAllMappings();
      if (rows.length === 0) return;

      const dbRows = rows.map(({ originalProductName, productName }) => ({
        original_product_name: originalProductName,
        product_name: productName,
      }));

      const { error } = await supabase
        .from('product_name_map')
        .upsert(dbRows, { onConflict: 'original_product_name' });

      if (error) {
        log.warn('ProductNameMap の DB 同期に失敗', { error: error.message });
      }
    } catch (e) {
      log.warn('ProductNameMap の DB 同期中にエラー', { error: e });
    }
  }
}
