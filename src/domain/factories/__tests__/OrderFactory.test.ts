import { describe, expect, it } from 'vitest';
import { PlatformOrderData } from '../../ports/OrderFetcher';
import { Platform } from '../../valueObjects/Platform';
import { OrderFactory } from '../OrderFactory';

describe('OrderFactory', () => {
  it('PlatformOrderData から Order を生成できる', () => {
    const factory = new OrderFactory();
    const data: PlatformOrderData = {
      orderId: 'ORD-2026-001',
      platform: Platform.Minne,
      buyerName: '山田 太郎',
      buyerPostalCode: '1500001',
      buyerPrefecture: '東京都',
      buyerCity: '渋谷区',
      buyerAddress1: '神宮前1-2-3',
      buyerAddress2: 'テストビル 101',
      buyerPhone: '090-1234-5678',
      productName: '木製キーホルダー',
      price: 1800,
      orderedAt: new Date('2026-02-12T12:00:00Z'),
    };

    const order = factory.createFromPlatformData(data);

    expect(order.orderId.toString()).toBe('ORD-2026-001');
    expect(order.platform.toString()).toBe('minne');
    expect(order.buyer.name.toString()).toBe('山田 太郎');
    expect(order.buyer.address.postalCode.toString()).toBe('1500001');
    expect(order.buyer.address.prefecture.toString()).toBe('東京都');
    expect(order.buyer.address.city).toBe('渋谷区');
    expect(order.buyer.address.street).toBe('神宮前1-2-3');
    expect(order.buyer.address.building).toBe('テストビル 101');
    expect(order.buyer.phoneNumber?.toString()).toBe('09012345678');
    expect(order.product.name).toBe('木製キーホルダー');
    expect(order.product.price).toBe(1800);
    expect(order.orderedAt.toISOString()).toBe('2026-02-12T12:00:00.000Z');
  });

  it('任意項目が未指定でも生成できる（priceは0を補完）', () => {
    const factory = new OrderFactory();
    const data: PlatformOrderData = {
      orderId: 'ORD-2026-002',
      platform: Platform.Creema,
      buyerName: '鈴木 一郎',
      buyerPostalCode: '0600001',
      buyerPrefecture: '北海道',
      buyerCity: '札幌市中央区',
      buyerAddress1: '北一条西1-1',
      productName: '刺繍ポーチ',
      orderedAt: new Date('2026-02-10T00:00:00Z'),
    };

    const order = factory.createFromPlatformData(data);

    expect(order.buyer.phoneNumber).toBeUndefined();
    expect(order.buyer.address.building).toBeUndefined();
    expect(order.product.price).toBe(0);
  });
});
