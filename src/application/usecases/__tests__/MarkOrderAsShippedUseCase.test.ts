import { describe, expect, it } from 'vitest';
import { MarkOrderAsShippedUseCase } from '../MarkOrderAsShippedUseCase';
import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';

class InMemoryOrderRepository implements OrderRepository {
  private readonly store = new Map<string, Order>();

  constructor(seedOrders: Order[] = []) {
    for (const order of seedOrders) {
      this.store.set(order.orderId.toString(), order);
    }
  }

  async findById(orderId: OrderId): Promise<Order | null> {
    return this.store.get(orderId.toString()) ?? null;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return [...this.store.values()].filter((order) => order.status.equals(status));
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    const normalized = name.trim();
    return [...this.store.values()].filter((order) =>
      order.buyer.name.toString().includes(normalized),
    );
  }

  async save(order: Order): Promise<void> {
    this.store.set(order.orderId.toString(), order);
  }

  async exists(orderId: OrderId): Promise<boolean> {
    return this.store.has(orderId.toString());
  }

  async findAll(): Promise<Order[]> {
    return [...this.store.values()];
  }
}

const orderFactory = new OrderFactory();

function createPendingOrder(orderId: string): Order {
  return orderFactory.createFromPlatformData({
    orderId,
    platform: Platform.Minne,
    buyerName: '山田 太郎',
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    buyerPhone: '09012345678',
    productName: 'ハンドメイドアクセサリー',
    price: 2500,
    orderedAt: new Date('2026-02-15T00:00:00.000Z'),
  });
}

describe('MarkOrderAsShippedUseCase', () => {
  it('pending注文を発送済みに更新し、配送情報を記録できる', async () => {
    const order = createPendingOrder('ORD-001');
    const repository = new InMemoryOrderRepository([order]);
    const useCase = new MarkOrderAsShippedUseCase(repository);

    const result = await useCase.execute({
      orderId: 'ORD-001',
      shippingMethod: 'click_post',
      trackingNumber: ' CP123456789JP ',
    });

    const saved = await repository.findById(new OrderId('ORD-001'));
    expect(saved).not.toBeNull();
    expect(saved?.status.equals(OrderStatus.Shipped)).toBe(true);
    expect(saved?.shippingMethod?.equals(ShippingMethod.ClickPost)).toBe(true);
    expect(saved?.trackingNumber?.toString()).toBe('CP123456789JP');
    expect(saved?.shippedAt).toBeInstanceOf(Date);

    expect(result.orderId).toBe('ORD-001');
    expect(result.status).toBe('shipped');
    expect(result.shippingMethod).toBe('click_post');
    expect(result.trackingNumber).toBe('CP123456789JP');
  });

  it('追跡番号なしでも発送済みにできる', async () => {
    const order = createPendingOrder('ORD-002');
    const repository = new InMemoryOrderRepository([order]);
    const useCase = new MarkOrderAsShippedUseCase(repository);

    const result = await useCase.execute({
      orderId: 'ORD-002',
      shippingMethod: 'yamato_compact',
      trackingNumber: '   ',
    });

    const saved = await repository.findById(new OrderId('ORD-002'));
    expect(saved?.status.equals(OrderStatus.Shipped)).toBe(true);
    expect(saved?.trackingNumber).toBeUndefined();
    expect(result.trackingNumber).toBeUndefined();
    expect(result.shippingMethod).toBe('yamato_compact');
  });

  it('対象注文が存在しない場合はエラーになる', async () => {
    const repository = new InMemoryOrderRepository();
    const useCase = new MarkOrderAsShippedUseCase(repository);

    await expect(
      useCase.execute({
        orderId: 'ORD-404',
        shippingMethod: 'click_post',
      }),
    ).rejects.toThrow('対象注文が見つかりません');
  });

  it('発送済み注文の再更新はエラーになる（DR-ORD-004）', async () => {
    const order = createPendingOrder('ORD-003');
    order.markAsShipped(ShippingMethod.ClickPost);

    const repository = new InMemoryOrderRepository([order]);
    const useCase = new MarkOrderAsShippedUseCase(repository);

    await expect(
      useCase.execute({
        orderId: 'ORD-003',
        shippingMethod: 'click_post',
      }),
    ).rejects.toThrow('発送済みの注文は変更できません');
  });
});
