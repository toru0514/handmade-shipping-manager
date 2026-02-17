import { describe, it, expect, vi, afterEach } from 'vitest';
import { Order } from '../Order';
import { Address } from '../../valueObjects/Address';
import { Buyer } from '../../valueObjects/Buyer';
import { BuyerName } from '../../valueObjects/BuyerName';
import { OrderId } from '../../valueObjects/OrderId';
import { OrderStatus } from '../../valueObjects/OrderStatus';
import { Platform } from '../../valueObjects/Platform';
import { PostalCode } from '../../valueObjects/PostalCode';
import { Prefecture } from '../../valueObjects/Prefecture';
import { Product } from '../../valueObjects/Product';
import { ShippingMethod } from '../../valueObjects/ShippingMethod';
import { TrackingNumber } from '../../valueObjects/TrackingNumber';

describe('Order', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const createBuyer = (): Buyer =>
    new Buyer({
      name: new BuyerName('田中太郎'),
      address: new Address({
        postalCode: new PostalCode('1000001'),
        prefecture: new Prefecture('東京都'),
        city: '千代田区',
        street: '千代田1-1',
      }),
    });

  const createProduct = (): Product =>
    new Product({
      name: 'ハンドメイド作品',
      price: 3000,
    });

  const createOrder = (orderedAt?: Date): Order =>
    Order.create({
      orderId: new OrderId('ORD-001'),
      platform: Platform.Minne,
      buyer: createBuyer(),
      product: createProduct(),
      orderedAt,
    });

  it('新規作成時にpending状態でOrderRegisteredイベントが発行される', () => {
    const order = createOrder();

    expect(order.status.equals(OrderStatus.Pending)).toBe(true);
    expect(order.shippedAt).toBeUndefined();
    expect(order.shippingMethod).toBeUndefined();
    expect(order.trackingNumber).toBeUndefined();

    const events = order.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('OrderRegistered');
  });

  it('reconstitute時はOrderRegisteredイベントを発行しない', () => {
    const order = Order.reconstitute({
      orderId: new OrderId('ORD-RECON-001'),
      platform: Platform.Creema,
      buyer: createBuyer(),
      product: createProduct(),
      status: OrderStatus.Pending,
      orderedAt: new Date('2026-02-10T00:00:00Z'),
    });

    expect(order.pullDomainEvents()).toEqual([]);
  });

  it('markAsShippedでpendingからshippedに遷移し、発送情報と日時を記録する', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00Z'));

    const order = createOrder(new Date('2026-02-15T00:00:00Z'));
    order.pullDomainEvents();

    const trackingNumber = new TrackingNumber('CP123456789JP');
    order.markAsShipped(ShippingMethod.ClickPost, trackingNumber);

    expect(order.status.equals(OrderStatus.Shipped)).toBe(true);
    expect(order.shippingMethod?.equals(ShippingMethod.ClickPost)).toBe(true);
    expect(order.trackingNumber?.equals(trackingNumber)).toBe(true);
    expect(order.shippedAt?.toISOString()).toBe('2026-02-17T00:00:00.000Z');
  });

  it('発送済み注文に対してmarkAsShippedを再実行するとエラーになる', () => {
    const order = createOrder();
    order.markAsShipped(ShippingMethod.YamatoCompact);

    expect(() => order.markAsShipped(ShippingMethod.ClickPost)).toThrow(
      '発送済みの注文は変更できません',
    );
  });

  it('markAsShipped時にOrderShippedイベントを発行する', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T12:00:00Z'));

    const order = createOrder();
    order.pullDomainEvents();

    order.markAsShipped(ShippingMethod.YamatoCompact);
    const events = order.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'OrderShipped',
      orderId: 'ORD-001',
      shippingMethod: 'yamato_compact',
      trackingNumber: undefined,
      occurredAt: new Date('2026-02-17T12:00:00Z'),
    });
  });

  it('getDaysSinceOrderは注文日からの経過日数を返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00Z'));

    const order = createOrder(new Date('2026-02-14T00:00:00Z'));
    expect(order.getDaysSinceOrder()).toBe(3);
  });

  it('isOverdueは3日以上経過したpending注文でtrueを返す（DR-ORD-006）', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00Z'));

    const order = createOrder(new Date('2026-02-14T00:00:00Z'));
    expect(order.isOverdue()).toBe(true);
  });

  it('isOverdueは3日未満またはshipped注文ではfalseを返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00Z'));

    const recentOrder = createOrder(new Date('2026-02-16T00:00:00Z'));
    expect(recentOrder.isOverdue()).toBe(false);

    const shippedOrder = createOrder(new Date('2026-02-10T00:00:00Z'));
    shippedOrder.markAsShipped(ShippingMethod.ClickPost);
    expect(shippedOrder.isOverdue()).toBe(false);
  });

  it('pullDomainEventsはイベントを返し、その後キューをクリアする', () => {
    const order = createOrder();

    const firstPull = order.pullDomainEvents();
    const secondPull = order.pullDomainEvents();

    expect(firstPull).toHaveLength(1);
    expect(secondPull).toEqual([]);
  });
});
