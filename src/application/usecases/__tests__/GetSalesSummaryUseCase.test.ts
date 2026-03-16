import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { GetSalesSummaryUseCase } from '../GetSalesSummaryUseCase';

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

function createOrder(
  orderId: string,
  platform: Platform,
  price: number,
  orderedAt: Date,
  shipped: boolean,
  shippedAt?: Date,
): Order {
  const order = factory.createFromPlatformData({
    orderId,
    platform,
    buyerName: '山田 太郎',
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    productName: 'ハンドメイドアクセサリー',
    price,
    orderedAt,
  });

  if (shipped) {
    // Set shippedAt via markAsShipped, then override the date if needed
    order.markAsShipped(new ShippingMethod('click_post'));
    if (shippedAt) {
      // Use reconstitute to set exact shippedAt
      Object.defineProperty(order, 'shippedAt', { value: shippedAt, writable: false });
    }
  }

  return order;
}

describe('GetSalesSummaryUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('発送済み注文のみを集計する', async () => {
    const shippedOrder = createOrder(
      'ORD-001',
      Platform.Minne,
      2500,
      new Date('2026-01-10'),
      true,
      new Date('2026-01-15'),
    );
    const pendingOrder = createOrder(
      'ORD-002',
      Platform.Minne,
      3000,
      new Date('2026-01-20'),
      false,
    );

    const repo = new InMemoryOrderRepository([shippedOrder, pendingOrder]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.totalOrders).toBe(1);
    expect(result.totalSales).toBe(2500);
  });

  it('期間フィルタが正しく適用される', async () => {
    const jan = createOrder(
      'ORD-001',
      Platform.Minne,
      1000,
      new Date('2026-01-05'),
      true,
      new Date('2026-01-10'),
    );
    const feb = createOrder(
      'ORD-002',
      Platform.Minne,
      2000,
      new Date('2026-02-05'),
      true,
      new Date('2026-02-10'),
    );
    const mar = createOrder(
      'ORD-003',
      Platform.Minne,
      3000,
      new Date('2026-03-05'),
      true,
      new Date('2026-03-10'),
    );

    const repo = new InMemoryOrderRepository([jan, feb, mar]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });

    expect(result.totalOrders).toBe(1);
    expect(result.totalSales).toBe(2000);
  });

  it('プラットフォームフィルタが正しく適用される', async () => {
    const minne = createOrder(
      'ORD-001',
      Platform.Minne,
      1000,
      new Date('2026-01-05'),
      true,
      new Date('2026-01-10'),
    );
    const creema = createOrder(
      'ORD-002',
      Platform.Creema,
      2000,
      new Date('2026-01-15'),
      true,
      new Date('2026-01-20'),
    );

    const repo = new InMemoryOrderRepository([minne, creema]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute({ platform: 'minne' });

    expect(result.totalOrders).toBe(1);
    expect(result.totalSales).toBe(1000);
  });

  it('平均注文単価を正しく計算する', async () => {
    const order1 = createOrder(
      'ORD-001',
      Platform.Minne,
      1000,
      new Date('2026-01-05'),
      true,
      new Date('2026-01-10'),
    );
    const order2 = createOrder(
      'ORD-002',
      Platform.Minne,
      2000,
      new Date('2026-01-15'),
      true,
      new Date('2026-01-20'),
    );
    const order3 = createOrder(
      'ORD-003',
      Platform.Minne,
      3000,
      new Date('2026-02-05'),
      true,
      new Date('2026-02-10'),
    );

    const repo = new InMemoryOrderRepository([order1, order2, order3]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.totalSales).toBe(6000);
    expect(result.totalOrders).toBe(3);
    expect(result.averageOrderValue).toBe(2000);
  });

  it('プラットフォーム別集計が正しく出力される', async () => {
    const minne1 = createOrder(
      'ORD-001',
      Platform.Minne,
      1000,
      new Date('2026-01-05'),
      true,
      new Date('2026-01-10'),
    );
    const minne2 = createOrder(
      'ORD-002',
      Platform.Minne,
      1500,
      new Date('2026-01-15'),
      true,
      new Date('2026-01-20'),
    );
    const creema = createOrder(
      'ORD-003',
      Platform.Creema,
      2000,
      new Date('2026-02-05'),
      true,
      new Date('2026-02-10'),
    );

    const repo = new InMemoryOrderRepository([minne1, minne2, creema]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.platformBreakdown).toHaveLength(2);
    const minneBreakdown = result.platformBreakdown.find((p) => p.platform === 'minne');
    const creemaBreakdown = result.platformBreakdown.find((p) => p.platform === 'creema');

    expect(minneBreakdown).toEqual({ platform: 'minne', totalSales: 2500, orderCount: 2 });
    expect(creemaBreakdown).toEqual({ platform: 'creema', totalSales: 2000, orderCount: 1 });
  });

  it('月別集計が正しく出力される', async () => {
    const jan = createOrder(
      'ORD-001',
      Platform.Minne,
      1000,
      new Date('2026-01-05'),
      true,
      new Date('2026-01-10'),
    );
    const feb1 = createOrder(
      'ORD-002',
      Platform.Minne,
      2000,
      new Date('2026-02-05'),
      true,
      new Date('2026-02-10'),
    );
    const feb2 = createOrder(
      'ORD-003',
      Platform.Minne,
      1500,
      new Date('2026-02-15'),
      true,
      new Date('2026-02-20'),
    );

    const repo = new InMemoryOrderRepository([jan, feb1, feb2]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });

    expect(result.monthlyBreakdown).toHaveLength(3);
    expect(result.monthlyBreakdown[0]).toEqual({
      yearMonth: '2026-01',
      totalSales: 1000,
      orderCount: 1,
    });
    expect(result.monthlyBreakdown[1]).toEqual({
      yearMonth: '2026-02',
      totalSales: 3500,
      orderCount: 2,
    });
    expect(result.monthlyBreakdown[2]).toEqual({
      yearMonth: '2026-03',
      totalSales: 0,
      orderCount: 0,
    });
  });

  it('注文一覧が発送日降順でソートされる', async () => {
    const order1 = createOrder(
      'ORD-001',
      Platform.Minne,
      1000,
      new Date('2026-01-05'),
      true,
      new Date('2026-01-10'),
    );
    const order2 = createOrder(
      'ORD-002',
      Platform.Minne,
      2000,
      new Date('2026-01-15'),
      true,
      new Date('2026-01-20'),
    );
    const order3 = createOrder(
      'ORD-003',
      Platform.Minne,
      3000,
      new Date('2026-02-05'),
      true,
      new Date('2026-02-10'),
    );

    const repo = new InMemoryOrderRepository([order1, order2, order3]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.orders).toHaveLength(3);
    expect(result.orders[0]?.orderId).toBe('ORD-003');
    expect(result.orders[1]?.orderId).toBe('ORD-002');
    expect(result.orders[2]?.orderId).toBe('ORD-001');
  });

  it('注文がない場合はゼロ値を返す', async () => {
    const repo = new InMemoryOrderRepository([]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.totalSales).toBe(0);
    expect(result.totalOrders).toBe(0);
    expect(result.averageOrderValue).toBe(0);
    expect(result.ordersWithMissingPrice).toBe(0);
    expect(result.orders).toEqual([]);
  });

  it('平均注文単価の計算で価格未取得（0円）の注文を除外する', async () => {
    const orderA = createOrder(
      'ORD-001',
      Platform.Minne,
      2500,
      new Date('2026-01-10'),
      true,
      new Date('2026-01-15'),
    );
    const orderB = createOrder(
      'ORD-002',
      Platform.Creema,
      0,
      new Date('2026-01-20'),
      true,
      new Date('2026-01-25'),
    );

    const repo = new InMemoryOrderRepository([orderA, orderB]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    // totalOrders は全発送済み注文数（価格0含む）
    expect(result.totalOrders).toBe(2);
    expect(result.totalSales).toBe(2500);
    // 平均単価は価格がある注文のみで計算: 2500 / 1 = 2500（2500 / 2 = 1250 ではない）
    expect(result.averageOrderValue).toBe(2500);
  });

  it('全注文が価格未取得の場合は平均注文単価が0になる', async () => {
    const order = createOrder(
      'ORD-001',
      Platform.Minne,
      0,
      new Date('2026-01-10'),
      true,
      new Date('2026-01-15'),
    );

    const repo = new InMemoryOrderRepository([order]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.totalOrders).toBe(1);
    expect(result.totalSales).toBe(0);
    expect(result.averageOrderValue).toBe(0);
  });

  it('価格が0の注文にpriceMissing=trueが設定される', async () => {
    const withPrice = createOrder(
      'ORD-001',
      Platform.Minne,
      2500,
      new Date('2026-01-10'),
      true,
      new Date('2026-01-15'),
    );
    const noPrice = createOrder(
      'ORD-002',
      Platform.Creema,
      0,
      new Date('2026-01-20'),
      true,
      new Date('2026-01-25'),
    );

    const repo = new InMemoryOrderRepository([withPrice, noPrice]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.ordersWithMissingPrice).toBe(1);

    const orderWithPrice = result.orders.find((o) => o.orderId === 'ORD-001');
    const orderNoPrice = result.orders.find((o) => o.orderId === 'ORD-002');
    expect(orderWithPrice?.priceMissing).toBe(false);
    expect(orderNoPrice?.priceMissing).toBe(true);
  });

  it('デフォルトで今年1月1日から今日までの期間が設定される', async () => {
    const lastYear = createOrder(
      'ORD-001',
      Platform.Minne,
      1000,
      new Date('2025-12-20'),
      true,
      new Date('2025-12-25'),
    );
    const thisYear = createOrder(
      'ORD-002',
      Platform.Minne,
      2000,
      new Date('2026-01-05'),
      true,
      new Date('2026-01-10'),
    );

    const repo = new InMemoryOrderRepository([lastYear, thisYear]);
    const useCase = new GetSalesSummaryUseCase(repo);

    const result = await useCase.execute();

    expect(result.totalOrders).toBe(1);
    expect(result.totalSales).toBe(2000);
  });
});
