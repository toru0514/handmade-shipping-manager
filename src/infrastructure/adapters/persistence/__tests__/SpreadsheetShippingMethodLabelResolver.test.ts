import { describe, expect, it } from 'vitest';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';
import { SpreadsheetShippingMethodLabelResolver } from '../SpreadsheetShippingMethodLabelResolver';

class InMemorySheetsClient implements SheetsClient {
  constructor(private readonly rows: string[][]) {}

  async readRows(): Promise<string[][]> {
    return this.rows.map((row) => [...row]);
  }

  async writeRows(): Promise<void> {
    throw new Error('not implemented');
  }

  async clearRows(): Promise<void> {
    throw new Error('not implemented');
  }
}

describe('SpreadsheetShippingMethodLabelResolver', () => {
  it('一致する method code がある場合はラベルを返す', async () => {
    const resolver = new SpreadsheetShippingMethodLabelResolver(
      new InMemorySheetsClient([
        ['click_post', 'クリックポスト(日本郵便)'],
        ['yamato_compact', '宅急便コンパクト(ヤマト運輸)'],
      ]),
    );

    await expect(resolver.resolve('click_post')).resolves.toBe('クリックポスト(日本郵便)');
    await expect(resolver.resolve('yamato_compact')).resolves.toBe('宅急便コンパクト(ヤマト運輸)');
  });

  it('一致する method code がない場合は元のコードを返す', async () => {
    const resolver = new SpreadsheetShippingMethodLabelResolver(
      new InMemorySheetsClient([['click_post', 'クリックポスト(日本郵便)']]),
    );

    await expect(resolver.resolve('unknown_method')).resolves.toBe('unknown_method');
  });
});
