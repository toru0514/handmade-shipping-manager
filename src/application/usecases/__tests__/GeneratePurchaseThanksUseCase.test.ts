import { describe, expect, it } from 'vitest';
import {
  GeneratePurchaseThanksUseCase,
  PurchaseThanksOrderNotFoundError,
  PurchaseThanksTemplateNotFoundError,
} from '@/application/usecases/GeneratePurchaseThanksUseCase';
import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';

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
    const keyword = name.trim();
    return [...this.store.values()].filter((order) =>
      order.buyer.name.toString().includes(keyword),
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

class InMemoryMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  private readonly store = new Map<string, MessageTemplate>();

  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    return this.store.get(type.value) ?? null;
  }

  async save(template: MessageTemplate): Promise<void> {
    this.store.set(template.type.value, template);
  }

  async resetToDefault(_type: MessageTemplateType): Promise<MessageTemplate> {
    throw new Error('not implemented for this test');
  }
}

const orderFactory = new OrderFactory();

function createOrder(orderId: string): Order {
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

function purchaseThanksTemplate(): MessageTemplate {
  return {
    id: 'purchase-thanks-template',
    type: MessageTemplateType.PurchaseThanks,
    content:
      '{{buyer_name}} 様\n{{product_name}} をご購入ありがとうございます。金額: {{price}} / 注文: {{order_id}} / {{platform}}',
    variables: [
      { name: 'buyer_name' },
      { name: 'product_name' },
      { name: 'price' },
      { name: 'order_id' },
      { name: 'platform' },
    ],
  };
}

describe('GeneratePurchaseThanksUseCase', () => {
  it('購入お礼テンプレートの変数を注文情報で置換して返す', async () => {
    const orderRepository = new InMemoryOrderRepository([createOrder('ORD-001')]);
    const templateRepository = new InMemoryMessageTemplateRepository();
    await templateRepository.save(purchaseThanksTemplate());
    const useCase = new GeneratePurchaseThanksUseCase(orderRepository, templateRepository);

    const result = await useCase.execute({ orderId: 'ORD-001' });

    expect(result.orderId).toBe('ORD-001');
    expect(result.message).toContain('山田 太郎');
    expect(result.message).toContain('ハンドメイドアクセサリー');
    expect(result.message).toContain('¥2,500');
    expect(result.message).toContain('ORD-001');
    expect(result.message).toContain('minne');
  });

  it('テンプレートが見つからない場合は専用エラーを返す', async () => {
    const orderRepository = new InMemoryOrderRepository([createOrder('ORD-002')]);
    const templateRepository = new InMemoryMessageTemplateRepository();
    const useCase = new GeneratePurchaseThanksUseCase(orderRepository, templateRepository);

    await expect(useCase.execute({ orderId: 'ORD-002' })).rejects.toBeInstanceOf(
      PurchaseThanksTemplateNotFoundError,
    );
  });

  it('対象注文が存在しない場合は専用エラーを返す', async () => {
    const orderRepository = new InMemoryOrderRepository();
    const templateRepository = new InMemoryMessageTemplateRepository();
    await templateRepository.save(purchaseThanksTemplate());
    const useCase = new GeneratePurchaseThanksUseCase(orderRepository, templateRepository);

    await expect(useCase.execute({ orderId: 'ORD-404' })).rejects.toBeInstanceOf(
      PurchaseThanksOrderNotFoundError,
    );
  });
});
