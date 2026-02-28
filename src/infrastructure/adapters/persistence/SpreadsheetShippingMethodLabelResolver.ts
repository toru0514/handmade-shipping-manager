import { ShippingMethodLabelResolver } from '@/domain/ports/ShippingMethodLabelResolver';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';

const DEFAULT_RANGE = 'ShippingMethodLabelMap!A2:B';

const COL = {
  methodCode: 0,
  label: 1,
} as const;

export class SpreadsheetShippingMethodLabelResolver implements ShippingMethodLabelResolver {
  constructor(private readonly sheetsClient: SheetsClient) {}

  async resolve(methodCode: string): Promise<string> {
    const code = methodCode.trim();
    if (!code) {
      return methodCode;
    }

    const rows = await this.sheetsClient.readRows(DEFAULT_RANGE);
    for (const row of rows) {
      const rawCode = (row[COL.methodCode] ?? '').trim();
      if (!rawCode || rawCode !== code) {
        continue;
      }

      const label = (row[COL.label] ?? '').trim();
      return label || code;
    }

    return code;
  }
}
