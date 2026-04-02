import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';
import { SpreadsheetProductNameResolver } from '../SpreadsheetProductNameResolver';
import { DualWriteProductNameResolver } from '../DualWriteProductNameResolver';

// Supabase モック
const mockUpsert = vi.fn().mockReturnValue({ error: null });
vi.mock('@/lib/supabase/product-client', () => ({
  isSupabaseEnabled: () => true,
  getSupabaseClient: () => ({
    from: () => ({ upsert: mockUpsert }),
  }),
}));

vi.mock('@/infrastructure/lib/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

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

describe('DualWriteProductNameResolver', () => {
  beforeEach(() => {
    mockUpsert.mockClear();
  });

  it('スプシから解決しつつ、初回にDBへマッピングを同期する', async () => {
    const sheetsClient = new InMemorySheetsClient([
      ['元の商品名A', '表示名A'],
      ['元の商品名B', '表示名B'],
    ]);
    const spreadsheetResolver = new SpreadsheetProductNameResolver(sheetsClient);
    const resolver = new DualWriteProductNameResolver(spreadsheetResolver);

    const result = await resolver.resolve('元の商品名A');
    expect(result).toBe('表示名A');

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        { original_product_name: '元の商品名A', product_name: '表示名A' },
        { original_product_name: '元の商品名B', product_name: '表示名B' },
      ],
      { onConflict: 'original_product_name' },
    );
  });

  it('2回目以降の呼び出しではDB同期を行わない', async () => {
    const sheetsClient = new InMemorySheetsClient([['元の商品名', '表示名']]);
    const spreadsheetResolver = new SpreadsheetProductNameResolver(sheetsClient);
    const resolver = new DualWriteProductNameResolver(spreadsheetResolver);

    await resolver.resolve('元の商品名');
    await resolver.resolve('元の商品名');

    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('マッピングが空の場合はDB同期をスキップする', async () => {
    const sheetsClient = new InMemorySheetsClient([]);
    const spreadsheetResolver = new SpreadsheetProductNameResolver(sheetsClient);
    const resolver = new DualWriteProductNameResolver(spreadsheetResolver);

    const result = await resolver.resolve('何か');
    expect(result).toBe('何か');
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
