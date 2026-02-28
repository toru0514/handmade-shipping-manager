import { describe, expect, it } from 'vitest';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';
import { SpreadsheetPurchaseThanksProductNameResolver } from '../SpreadsheetPurchaseThanksProductNameResolver';

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

describe('SpreadsheetPurchaseThanksProductNameResolver', () => {
  it('完全一致する対応表がある場合は購入お礼用の商品名を返す', async () => {
    const resolver = new SpreadsheetPurchaseThanksProductNameResolver(
      new InMemorySheetsClient([
        [
          '金箔×木材コラボ_エボニー_イヤーカフ_銀箔_金箔_木のアクセサリー_ウッドアクセサリー_黒色_金属アレルギー対応(三角M(金箔))',
          'ウッドイヤーカフ_エボニー(三角M_金箔)',
        ],
      ]),
    );

    await expect(
      resolver.resolve(
        '金箔×木材コラボ_エボニー_イヤーカフ_銀箔_金箔_木のアクセサリー_ウッドアクセサリー_黒色_金属アレルギー対応(三角M(金箔))',
      ),
    ).resolves.toBe('ウッドイヤーカフ_エボニー(三角M_金箔)');
  });

  it('ベース名一致 + オプション付きの場合、オプションをそのまま後ろに付与する', async () => {
    const resolver = new SpreadsheetPurchaseThanksProductNameResolver(
      new InMemorySheetsClient([
        [
          '金箔×木材コラボ_エボニー_イヤーカフ_銀箔_金箔_木のアクセサリー_ウッドアクセサリー_黒色_金属アレルギー対応',
          'ウッドイヤーカフ_エボニー',
        ],
      ]),
    );

    await expect(
      resolver.resolve(
        '金箔×木材コラボ_エボニー_イヤーカフ_銀箔_金箔_木のアクセサリー_ウッドアクセサリー_黒色_金属アレルギー対応(三角M(金箔))',
      ),
    ).resolves.toBe('ウッドイヤーカフ_エボニー(三角M(金箔))');
  });

  it('一致する対応表がない場合は元の商品名を返す', async () => {
    const resolver = new SpreadsheetPurchaseThanksProductNameResolver(
      new InMemorySheetsClient([['A', 'B']]),
    );

    await expect(resolver.resolve('未登録商品')).resolves.toBe('未登録商品');
  });
});
