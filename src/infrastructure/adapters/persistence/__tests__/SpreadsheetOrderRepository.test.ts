import { describe, expect, it } from 'vitest';
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

  async readRows(): Promise<string[][]> {
    return this.rows.map((row) => [...row]);
  }

  async writeRows(rows: string[][]): Promise<void> {
    this.rows = rows.map((row) => [...row]);
  }

  async clearRows(): Promise<void> {
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
});
