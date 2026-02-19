import { afterEach, describe, expect, it, vi } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { Platform } from '@/domain/valueObjects/Platform';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';
import { SpreadsheetOrderRepository } from '../SpreadsheetOrderRepository';

class InMemorySheetsClient implements SheetsClient {
  private rows: string[][] = [];
  readCount = 0;
  clearCount = 0;
  writeCount = 0;

  async readRows(): Promise<string[][]> {
    this.readCount += 1;
    return this.rows.map((row) => [...row]);
  }

  async writeRows(rows: string[][]): Promise<void> {
    this.writeCount += 1;
    this.rows = rows.map((row) => [...row]);
  }

  async clearRows(): Promise<void> {
    this.clearCount += 1;
    this.rows = [];
  }
}

const factory = new OrderFactory();

function createOrder(orderId: string, buyerName: string): Order {
  return factory.createFromPlatformData({
    orderId,
    platform: Platform.Minne,
    buyerName,
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    buyerPhone: '09012345678',
    productName: 'ハンドメイドアクセサリー',
    price: 2500,
    orderedAt: new Date('2026-02-14T00:00:00Z'),
  });
}

describe('SpreadsheetOrderRepository', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('save/findById/exists を連携して扱える（統合）', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);
    const order = createOrder('ORD-001', '山田 太郎');

    await repository.save(order);

    const found = await repository.findById(new OrderId('ORD-001'));
    expect(found).not.toBeNull();
    expect(found?.orderId.toString()).toBe('ORD-001');
    expect(await repository.exists(new OrderId('ORD-001'))).toBe(true);
    expect(await repository.exists(new OrderId('ORD-999'))).toBe(false);
  });

  it('save は同一 orderId なら上書き更新する', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);

    const initial = createOrder('ORD-001', '山田 太郎');
    await repository.save(initial);

    const updated = createOrder('ORD-001', '田中 花子');
    await repository.save(updated);

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.buyer.name.toString()).toBe('田中 花子');
  });

  it('findByStatus で pending / shipped を検索できる', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);

    const pendingOrder = createOrder('ORD-001', '山田 太郎');
    const shippedOrder = createOrder('ORD-002', '佐藤 次郎');
    shippedOrder.markAsShipped(ShippingMethod.ClickPost, new TrackingNumber('CP123456789JP'));

    await repository.save(pendingOrder);
    await repository.save(shippedOrder);

    const pending = await repository.findByStatus(OrderStatus.Pending);
    const shipped = await repository.findByStatus(OrderStatus.Shipped);

    expect(pending).toHaveLength(1);
    expect(pending[0]?.orderId.toString()).toBe('ORD-001');
    expect(shipped).toHaveLength(1);
    expect(shipped[0]?.orderId.toString()).toBe('ORD-002');
  });

  it('findByBuyerName で部分一致検索できる', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);

    await repository.save(createOrder('ORD-001', '山田 太郎'));
    await repository.save(createOrder('ORD-002', '田中 花子'));

    const found = await repository.findByBuyerName('山田');
    expect(found).toHaveLength(1);
    expect(found[0]?.orderId.toString()).toBe('ORD-001');
  });

  it('findAll で保存済み注文を全件取得できる', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);

    await repository.save(createOrder('ORD-001', '山田 太郎'));
    await repository.save(createOrder('ORD-002', '田中 花子'));

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
  });

  it('save 時に先に clearRows してから writeRows する（行減少時の残存防止）', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);

    await repository.save(createOrder('ORD-001', '山田 太郎'));
    await repository.save(createOrder('ORD-001', '山田 花子'));

    expect(client.clearCount).toBe(2);
    expect(client.writeCount).toBe(2);
  });

  it('同一インスタンス内で複数クエリを呼んでも readRows は1回だけ', async () => {
    const client = new InMemorySheetsClient();
    await client.writeRows([
      [
        'ORD-001',
        'minne',
        '山田 太郎',
        '1500001',
        '東京都',
        '渋谷区',
        '神宮前1-1-1',
        '',
        '09012345678',
        'ハンドメイドアクセサリー',
        '2500',
        'pending',
        '2026-02-14T00:00:00.000Z',
        '',
        '',
        '',
      ],
    ]);
    const repository = new SpreadsheetOrderRepository(client);

    await repository.findById(new OrderId('ORD-001'));
    await repository.findByStatus(OrderStatus.Pending);
    await repository.findByBuyerName('山田');
    await repository.exists(new OrderId('ORD-001'));
    await repository.findAll();

    expect(client.readCount).toBe(1);
  });

  it('save 後はキャッシュが無効化され、次の検索で再読込される', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);
    await client.writeRows([
      [
        'ORD-001',
        'minne',
        '山田 太郎',
        '1500001',
        '東京都',
        '渋谷区',
        '神宮前1-1-1',
        '',
        '09012345678',
        'ハンドメイドアクセサリー',
        '2500',
        'pending',
        '2026-02-14T00:00:00.000Z',
        '',
        '',
        '',
      ],
    ]);

    await repository.findAll();
    expect(client.readCount).toBe(1);

    await repository.save(createOrder('ORD-001', '田中 花子'));
    await repository.findAll();

    expect(client.readCount).toBe(2);
  });

  it('キャッシュ有無で検索結果の振る舞いが変わらない（再取得で再デシリアライズ）', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);
    await repository.save(createOrder('ORD-001', '山田 太郎'));

    const first = await repository.findAll();
    first[0]!.status = OrderStatus.Shipped;

    const second = await repository.findAll();
    expect(second[0]!.status.equals(OrderStatus.Pending)).toBe(true);
  });

  it('壊れた行はスキップし、警告ログを出して正常行のみ返す', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await client.writeRows([
      [
        'ORD-001',
        'minne',
        '山田 太郎',
        '1500001',
        '東京都',
        '渋谷区',
        '神宮前1-1-1',
        '',
        '09012345678',
        'ハンドメイドアクセサリー',
        '2500',
        'pending',
        '2026-02-14T00:00:00.000Z',
        '',
        '',
        '',
      ],
      [
        'ORD-999',
        'minne',
        '壊れた データ',
        '1500001',
        '東京都',
        '渋谷区',
        '神宮前1-1-1',
        '',
        '09012345678',
        'ハンドメイドアクセサリー',
        '2500',
        'shipped',
        '2026-02-14T00:00:00.000Z',
        '2026-02-15T00:00:00.000Z',
        'invalid_method',
        'CP123456789JP',
      ],
    ]);

    const orders = await repository.findAll();

    expect(orders).toHaveLength(1);
    expect(orders[0]?.orderId.toString()).toBe('ORD-001');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('壊れた行をスキップしました');

    const broken = await repository.findById(new OrderId('ORD-999'));
    expect(broken).toBeNull();
  });
});
