import { ProductNameResolver } from '@/domain/ports/ProductNameResolver';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';

const DEFAULT_RANGE = 'ProductNameMap!A2:B';

const COL = {
  originalProductName: 0,
  productName: 1,
} as const;

export class SpreadsheetProductNameResolver implements ProductNameResolver {
  private cachedRows: string[][] | null = null;

  constructor(private readonly sheetsClient: SheetsClient) {}

  async resolve(originalProductName: string): Promise<string> {
    const source = originalProductName.trim();
    if (source.length === 0) {
      return originalProductName;
    }

    if (!this.cachedRows) {
      this.cachedRows = await this.sheetsClient.readRows(DEFAULT_RANGE);
    }
    const rows = this.cachedRows;
    let prefixMatched: string | null = null;
    let prefixMatchedLength = -1;

    for (const row of rows) {
      const raw = (row[COL.originalProductName] ?? '').trim();
      if (!raw) {
        continue;
      }
      const mapped = (row[COL.productName] ?? '').trim();
      if (!mapped) {
        continue;
      }

      if (raw === source) {
        return mapped;
      }

      if (!source.startsWith(raw)) {
        continue;
      }

      const suffix = source.slice(raw.length);
      if (!this.isOptionSuffix(suffix)) {
        continue;
      }

      // 複数ヒット時は、より長いキー（より具体的な変換）を優先する。
      if (raw.length > prefixMatchedLength) {
        prefixMatched = `${mapped}${suffix}`;
        prefixMatchedLength = raw.length;
      }
    }

    return prefixMatched ?? source;
  }

  /**
   * スプシ上の全マッピングを返す（DB同期用）。
   */
  async getAllMappings(): Promise<Array<{ originalProductName: string; productName: string }>> {
    if (!this.cachedRows) {
      this.cachedRows = await this.sheetsClient.readRows(DEFAULT_RANGE);
    }
    const results: Array<{ originalProductName: string; productName: string }> = [];
    for (const row of this.cachedRows) {
      const original = (row[COL.originalProductName] ?? '').trim();
      const mapped = (row[COL.productName] ?? '').trim();
      if (original && mapped) {
        results.push({ originalProductName: original, productName: mapped });
      }
    }
    return results;
  }

  private isOptionSuffix(suffix: string): boolean {
    if (!suffix) {
      return false;
    }
    const trimmed = suffix.trimStart();
    return trimmed.startsWith('(') || trimmed.startsWith('（');
  }
}
