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

  getRawRows(): string[][] {
    return this.rows.map((row) => [...row]);
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

function createMultiProductOrder(orderId: string, buyerName: string): Order {
  return factory.createFromPlatformData({
    orderId,
    platform: Platform.Minne,
    buyerName,
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    buyerPhone: '09012345678',
    productName: '',
    price: 0,
    orderedAt: new Date('2026-02-14T00:00:00Z'),
    products: [
      { name: 'ハンドメイドピアス', price: 1500, quantity: 2 },
      { name: 'ハンドメイドネックレス', price: 3000, quantity: 1 },
    ],
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
    expect(found?.shortProductName).toBe('アクセサリー');
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
    expect(warnSpy.mock.calls[0]?.[0]).toContain('orderId=ORD-999');
    expect(warnSpy.mock.calls[0]?.[0]).toContain('row=3');
  });

  it('shortProductName 列がある場合はその値を優先して読み込む', async () => {
    const client = new InMemorySheetsClient();
    const repository = new SpreadsheetOrderRepository(client);
    await client.writeRows([
      [
        'ORD-777',
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
        '書籍',
      ],
    ]);

    const found = await repository.findById(new OrderId('ORD-777'));
    expect(found).not.toBeNull();
    expect(found?.shortProductName).toBe('書籍');
  });

  describe('複数商品の注文', () => {
    it('複数商品の注文が商品数分の行に展開されてスプレッドシートに保存される', async () => {
      const client = new InMemorySheetsClient();
      const repository = new SpreadsheetOrderRepository(client);
      const order = createMultiProductOrder('ORD-001', '山田 太郎');

      await repository.save(order);

      const rawRows = client.getRawRows();
      expect(rawRows).toHaveLength(2);

      // 両行とも同じ注文情報
      expect(rawRows[0]![0]).toBe('ORD-001');
      expect(rawRows[1]![0]).toBe('ORD-001');
      expect(rawRows[0]![2]).toBe('山田 太郎');
      expect(rawRows[1]![2]).toBe('山田 太郎');

      // 商品情報は各行で異なる
      expect(rawRows[0]![9]).toBe('ハンドメイドピアス');
      expect(rawRows[0]![10]).toBe('1500');
      expect(rawRows[0]![17]).toBe('2'); // quantity
      expect(rawRows[1]![9]).toBe('ハンドメイドネックレス');
      expect(rawRows[1]![10]).toBe('3000');
      expect(rawRows[1]![17]).toBe('1'); // quantity
    });

    it('複数商品の注文を save → findAll で正しく復元できる', async () => {
      const client = new InMemorySheetsClient();
      const repository = new SpreadsheetOrderRepository(client);
      const order = createMultiProductOrder('ORD-001', '山田 太郎');

      await repository.save(order);

      const orders = await repository.findAll();
      expect(orders).toHaveLength(1);
      expect(orders[0]!.products).toHaveLength(2);
      expect(orders[0]!.products[0]!.name).toBe('ハンドメイドピアス');
      expect(orders[0]!.products[0]!.price).toBe(1500);
      expect(orders[0]!.products[0]!.quantity).toBe(2);
      expect(orders[0]!.products[1]!.name).toBe('ハンドメイドネックレス');
      expect(orders[0]!.products[1]!.price).toBe(3000);
      expect(orders[0]!.products[1]!.quantity).toBe(1);
    });

    it('複数商品の注文を上書き更新すると旧行が全て除去される', async () => {
      const client = new InMemorySheetsClient();
      const repository = new SpreadsheetOrderRepository(client);

      // 最初に2商品の注文を保存
      const initial = createMultiProductOrder('ORD-001', '山田 太郎');
      await repository.save(initial);

      // 1商品の注文で上書き
      const updated = createOrder('ORD-001', '山田 太郎');
      await repository.save(updated);

      const rawRows = client.getRawRows();
      expect(rawRows).toHaveLength(1); // 旧2行が消えて1行に
      expect(rawRows[0]![9]).toBe('ハンドメイドアクセサリー');

      const orders = await repository.findAll();
      expect(orders).toHaveLength(1);
      expect(orders[0]!.products).toHaveLength(1);
    });

    it('単一商品と複数商品の注文が混在しても正しく扱える', async () => {
      const client = new InMemorySheetsClient();
      const repository = new SpreadsheetOrderRepository(client);

      await repository.save(createOrder('ORD-001', '山田 太郎'));
      await repository.save(createMultiProductOrder('ORD-002', '田中 花子'));
      await repository.save(createOrder('ORD-003', '佐藤 次郎'));

      const rawRows = client.getRawRows();
      expect(rawRows).toHaveLength(4); // 1 + 2 + 1

      const orders = await repository.findAll();
      expect(orders).toHaveLength(3);
      expect(orders[0]!.products).toHaveLength(1);
      expect(orders[1]!.products).toHaveLength(2);
      expect(orders[2]!.products).toHaveLength(1);
    });

    it('quantity が正しく保存・復元される', async () => {
      const client = new InMemorySheetsClient();
      const repository = new SpreadsheetOrderRepository(client);
      const order = createMultiProductOrder('ORD-001', '山田 太郎');

      await repository.save(order);

      const found = await repository.findById(new OrderId('ORD-001'));
      expect(found).not.toBeNull();
      expect(found!.products[0]!.quantity).toBe(2);
      expect(found!.products[1]!.quantity).toBe(1);
      expect(found!.totalPrice).toBe(1500 * 2 + 3000 * 1);
    });
  });

  describe('後方互換性', () => {
    it('旧形式（productsJson列にJSON）の行も正しく読める', async () => {
      const client = new InMemorySheetsClient();
      const repository = new SpreadsheetOrderRepository(client);

      // 旧形式: 1行で、col 17にJSONが入っている
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
          'ハンドメイドピアス',
          '1500',
          'pending',
          '2026-02-14T00:00:00.000Z',
          '',
          '',
          '',
          'アクセサリー',
          '[{"name":"ハンドメイドピアス","price":1500,"quantity":2},{"name":"ハンドメイドネックレス","price":3000,"quantity":1}]',
        ],
      ]);

      const orders = await repository.findAll();
      expect(orders).toHaveLength(1);
      expect(orders[0]!.products).toHaveLength(2);
      expect(orders[0]!.products[0]!.name).toBe('ハンドメイドピアス');
      expect(orders[0]!.products[0]!.quantity).toBe(2);
      expect(orders[0]!.products[1]!.name).toBe('ハンドメイドネックレス');
      expect(orders[0]!.products[1]!.quantity).toBe(1);
    });

    it('quantity列がない旧データはデフォルト1として扱う', async () => {
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

      const orders = await repository.findAll();
      expect(orders).toHaveLength(1);
      expect(orders[0]!.products[0]!.quantity).toBe(1);
    });
  });
});
