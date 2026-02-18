import { describe, expect, it } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { SearchBuyersUseCase } from '../SearchBuyersUseCase';

class InMemoryOrderRepository implements OrderRepository {
  constructor(private readonly orders: Order[]) {}

  async findById(orderId: OrderId): Promise<Order | null> {
    return this.orders.find((order) => order.orderId.equals(orderId)) ?? null;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orders.filter((order) => order.status.equals(status));
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    const normalized = name.trim();
    return this.orders.filter((order) => order.buyer.name.toString().includes(normalized));
  }

  async save(_order: Order): Promise<void> {}

  async exists(orderId: OrderId): Promise<boolean> {
    return this.orders.some((order) => order.orderId.equals(orderId));
  }

  async findAll(): Promise<Order[]> {
    return this.orders;
  }
}

const orderFactory = new OrderFactory();

function createOrder(params: {
  orderId: string;
  buyerName: string;
  platform: Platform;
  price: number;
  orderedAt: string;
  buyerPostalCode?: string;
  buyerPrefecture?: string;
  buyerCity?: string;
  buyerAddress1?: string;
  buyerAddress2?: string;
  buyerPhone?: string;
}): Order {
  return orderFactory.createFromPlatformData({
    orderId: params.orderId,
    platform: params.platform,
    buyerName: params.buyerName,
    buyerPostalCode: params.buyerPostalCode ?? '1000001',
    buyerPrefecture: params.buyerPrefecture ?? '東京都',
    buyerCity: params.buyerCity ?? '千代田区',
    buyerAddress1: params.buyerAddress1 ?? '千代田1-1',
    buyerAddress2: params.buyerAddress2,
    buyerPhone: params.buyerPhone ?? '09012345678',
    productName: 'ハンドメイド作品',
    price: params.price,
    orderedAt: new Date(params.orderedAt),
  });
}

describe('SearchBuyersUseCase', () => {
  it('購入者名の部分一致で検索し、購入者ごとに集約した詳細を返す', async () => {
    const repository = new InMemoryOrderRepository([
      createOrder({
        orderId: 'ORD-001',
        buyerName: '山田 太郎',
        platform: Platform.Minne,
        price: 2500,
        orderedAt: '2026-02-15T00:00:00.000Z',
      }),
      createOrder({
        orderId: 'ORD-002',
        buyerName: '山田 太郎',
        platform: Platform.Creema,
        price: 3000,
        orderedAt: '2026-02-16T00:00:00.000Z',
      }),
      createOrder({
        orderId: 'ORD-003',
        buyerName: '山田 花子',
        platform: Platform.Minne,
        price: 1800,
        orderedAt: '2026-02-14T00:00:00.000Z',
      }),
    ]);

    const useCase = new SearchBuyersUseCase(repository);
    const result = await useCase.execute({ buyerName: '山田' });

    expect(result).toHaveLength(2);

    const taro = result.find((buyer) => buyer.buyerName === '山田 太郎');
    expect(taro).toBeDefined();
    expect(taro?.orderCount).toBe(2);
    expect(taro?.totalAmount).toBe(5500);
    expect(taro?.orderHistory).toHaveLength(2);
    expect(taro?.orderHistory[0]?.orderId).toBe('ORD-002');
    expect(taro?.orderHistory[1]?.orderId).toBe('ORD-001');
  });

  it('検索文字列が空白のみの場合は空配列を返す', async () => {
    const repository = new InMemoryOrderRepository([
      createOrder({
        orderId: 'ORD-001',
        buyerName: '山田 太郎',
        platform: Platform.Minne,
        price: 2500,
        orderedAt: '2026-02-15T00:00:00.000Z',
      }),
    ]);

    const useCase = new SearchBuyersUseCase(repository);
    const result = await useCase.execute({ buyerName: '   ' });

    expect(result).toEqual([]);
  });

  it('検索結果が100件を超える場合は最大100件に制限される', async () => {
    const orders: Order[] = [];
    for (let i = 0; i < 101; i += 1) {
      const day = ((i % 28) + 1).toString().padStart(2, '0');
      orders.push(
        createOrder({
          orderId: `ORD-${i.toString().padStart(3, '0')}`,
          buyerName: `田中${i}`,
          platform: i % 2 === 0 ? Platform.Minne : Platform.Creema,
          price: 1000 + i,
          orderedAt: `2026-02-${day}T00:00:00.000Z`,
          buyerPostalCode: `${(1000001 + i).toString().slice(0, 7)}`,
          buyerCity: `都市${i}`,
          buyerAddress1: `住所${i}`,
          buyerPhone: `090${(10000000 + i).toString().slice(-8)}`,
        }),
      );
    }

    const repository = new InMemoryOrderRepository(orders);
    const useCase = new SearchBuyersUseCase(repository);
    const result = await useCase.execute({ buyerName: '田中' });

    expect(result).toHaveLength(100);
  });

  it('同姓同名でも住所・電話が異なる場合は別購入者として扱う', async () => {
    const repository = new InMemoryOrderRepository([
      createOrder({
        orderId: 'ORD-101',
        buyerName: '佐藤 花子',
        platform: Platform.Minne,
        price: 2000,
        orderedAt: '2026-02-11T00:00:00.000Z',
        buyerPostalCode: '1000001',
        buyerCity: '千代田区',
        buyerAddress1: '千代田1-1',
        buyerPhone: '09011112222',
      }),
      createOrder({
        orderId: 'ORD-102',
        buyerName: '佐藤 花子',
        platform: Platform.Creema,
        price: 2800,
        orderedAt: '2026-02-12T00:00:00.000Z',
        buyerPostalCode: '1500001',
        buyerCity: '渋谷区',
        buyerAddress1: '神宮前1-2-3',
        buyerPhone: '09033334444',
      }),
    ]);

    const useCase = new SearchBuyersUseCase(repository);
    const result = await useCase.execute({ buyerName: '佐藤' });

    expect(result).toHaveLength(2);
    expect(result[0]?.buyerId).not.toBe(result[1]?.buyerId);
    expect(result[0]?.orderCount).toBe(1);
    expect(result[1]?.orderCount).toBe(1);
  });
});
