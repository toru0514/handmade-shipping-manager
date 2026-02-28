import { PurchaseThanksProductNameResolver } from '@/domain/ports/PurchaseThanksProductNameResolver';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';

const DEFAULT_RANGE = 'PurchaseThanksProductNameMap!A2:B';

const COL = {
  originalProductName: 0,
  purchaseThanksProductName: 1,
} as const;

export class SpreadsheetPurchaseThanksProductNameResolver implements PurchaseThanksProductNameResolver {
  constructor(private readonly sheetsClient: SheetsClient) {}

  async resolve(originalProductName: string): Promise<string> {
    const source = originalProductName.trim();
    if (source.length === 0) {
      return originalProductName;
    }

    const rows = await this.sheetsClient.readRows(DEFAULT_RANGE);
    let prefixMatched: string | null = null;
    let prefixMatchedLength = -1;

    for (const row of rows) {
      const raw = (row[COL.originalProductName] ?? '').trim();
      if (!raw) {
        continue;
      }
      const mapped = (row[COL.purchaseThanksProductName] ?? '').trim();
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

  private isOptionSuffix(suffix: string): boolean {
    if (!suffix) {
      return false;
    }
    const trimmed = suffix.trimStart();
    return trimmed.startsWith('(') || trimmed.startsWith('（');
  }
}
