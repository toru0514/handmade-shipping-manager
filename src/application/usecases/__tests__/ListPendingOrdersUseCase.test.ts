import { describe, expect, it } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { ListPendingOrdersUseCase } from '../ListPendingOrdersUseCase';

class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[] = [];

  constructor(orders: Order[] = []) {
    this.orders = orders;
  }

  async findById(orderId: OrderId): Promise<Order | null> {
    return this.orders.find((o) => o.orderId.equals(orderId)) ?? null;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orders.filter((o) => o.status.equals(status));
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    return this.orders.filter((o) => o.buyer.name.toString().includes(name));
  }

  async save(order: Order): Promise<void> {
    const idx = this.orders.findIndex((o) => o.orderId.equals(order.orderId));
    if (idx >= 0) {
      this.orders[idx] = order;
    } else {
      this.orders.push(order);
    }
  }

  async exists(orderId: OrderId): Promise<boolean> {
    return this.orders.some((o) => o.orderId.equals(orderId));
  }

  async findAll(): Promise<Order[]> {
    return [...this.orders];
  }
}

const factory = new OrderFactory();
const overdueSpec = new OverdueOrderSpecification();

function createPendingOrder(orderId: string, buyerName: string, orderedAt: Date): Order {
  return factory.createFromPlatformData({
    orderId,
    platform: Platform.Minne,
    buyerName,
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    productName: 'ハンドメイドアクセサリー',
    price: 2500,
    orderedAt,
  });
}

describe('ListPendingOrdersUseCase', () => {
  it('pending ステータスの注文のみ返す', async () => {
    const pending = createPendingOrder('ORD-001', '山田 太郎', new Date());
    const shipped = createPendingOrder('ORD-002', '田中 花子', new Date());
    shipped.markAsShipped(new ShippingMethod('click_post'));

    const repo = new InMemoryOrderRepository([pending, shipped]);
    const useCase = new ListPendingOrdersUseCase(repo, overdueSpec);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]?.orderId).toBe('ORD-001');
  });

  it('注文情報が DTO に正しくマッピングされる', async () => {
    const order = createPendingOrder('ORD-001', '山田 太郎', new Date());
    const repo = new InMemoryOrderRepository([order]);
    const useCase = new ListPendingOrdersUseCase(repo, overdueSpec);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      orderId: 'ORD-001',
      platform: 'minne',
      buyerName: '山田 太郎',
      productName: 'ハンドメイドアクセサリー',
    });
    expect(typeof result[0]?.orderedAt).toBe('string');
    expect(() => new Date(result[0]!.orderedAt).toISOString()).not.toThrow();
    expect(result[0]?.daysSinceOrder).toBeGreaterThanOrEqual(0);
    expect(result[0]?.isOverdue).toBe(false);
  });

  it('3日以上経過した注文は isOverdue が true になる', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const order = createPendingOrder('ORD-001', '山田 太郎', fourDaysAgo);
    const repo = new InMemoryOrderRepository([order]);
    const useCase = new ListPendingOrdersUseCase(repo, overdueSpec);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]?.isOverdue).toBe(true);
    expect(result[0]?.daysSinceOrder).toBeGreaterThanOrEqual(3);
  });

  it('注文がない場合は空配列を返す', async () => {
    const repo = new InMemoryOrderRepository([]);
    const useCase = new ListPendingOrdersUseCase(repo, overdueSpec);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('複数の pending 注文を全て返す', async () => {
    const order1 = createPendingOrder('ORD-001', '山田 太郎', new Date());
    const order2 = createPendingOrder('ORD-002', '田中 花子', new Date());
    const order3 = createPendingOrder('ORD-003', '佐藤 次郎', new Date());

    const repo = new InMemoryOrderRepository([order1, order2, order3]);
    const useCase = new ListPendingOrdersUseCase(repo, overdueSpec);

    const result = await useCase.execute();

    expect(result).toHaveLength(3);
  });
});
