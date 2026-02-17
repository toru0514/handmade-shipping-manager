import { afterEach, describe, expect, it, vi } from 'vitest';
import { Order } from '../../entities/Order';
import { Address } from '../../valueObjects/Address';
import { Buyer } from '../../valueObjects/Buyer';
import { BuyerName } from '../../valueObjects/BuyerName';
import { OrderId } from '../../valueObjects/OrderId';
import { Platform } from '../../valueObjects/Platform';
import { PostalCode } from '../../valueObjects/PostalCode';
import { Prefecture } from '../../valueObjects/Prefecture';
import { Product } from '../../valueObjects/Product';
import { ShippingMethod } from '../../valueObjects/ShippingMethod';
import { OverdueOrderSpecification } from '../OverdueOrderSpecification';

describe('OverdueOrderSpecification', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const createOrder = (orderedAt: Date): Order =>
    Order.create({
      orderId: new OrderId('ORD-001'),
      platform: Platform.Creema,
      buyer: new Buyer({
        name: new BuyerName('田中 花子'),
        address: new Address({
          postalCode: new PostalCode('5300001'),
          prefecture: new Prefecture('大阪府'),
          city: '大阪市北区',
          street: '梅田1-1-1',
        }),
      }),
      product: new Product({ name: '陶器マグカップ', price: 3200 }),
      orderedAt,
    });

  it('3日以上経過したpending注文をtrueで判定する', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00Z'));

    const order = createOrder(new Date('2026-02-14T00:00:00Z'));
    const specification = new OverdueOrderSpecification();

    expect(specification.isSatisfiedBy(order)).toBe(true);
  });

  it('3日未満のpending注文はfalseを返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00Z'));

    const order = createOrder(new Date('2026-02-16T00:00:00Z'));
    const specification = new OverdueOrderSpecification();

    expect(specification.isSatisfiedBy(order)).toBe(false);
  });

  it('shipped注文は3日以上でもfalseを返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00Z'));

    const order = createOrder(new Date('2026-02-10T00:00:00Z'));
    order.markAsShipped(ShippingMethod.YamatoCompact);

    const specification = new OverdueOrderSpecification();
    expect(specification.isSatisfiedBy(order)).toBe(false);
  });
});
