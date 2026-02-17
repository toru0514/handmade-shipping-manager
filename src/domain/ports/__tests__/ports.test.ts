import { describe, expectTypeOf, it } from 'vitest';
import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { NotificationSender } from '@/domain/ports/NotificationSender';
import { OrderFetcher, PlatformOrderData } from '@/domain/ports/OrderFetcher';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ShippingLabelIssuer } from '@/domain/ports/ShippingLabelIssuer';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { Message } from '@/domain/valueObjects/Message';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';

describe('domain ports', () => {
  it('OrderRepository interface のシグネチャを満たせる', () => {
    type Order = { id: string };

    const repository: OrderRepository<Order> = {
      findById: async (_orderId: OrderId) => null,
      findByStatus: async (_status: OrderStatus) => [],
      findByBuyerName: async (_name: string) => [],
      save: async (_order: Order) => undefined,
      exists: async (_orderId: OrderId) => false,
      findAll: async () => [],
    };

    expectTypeOf(repository.findById).toBeFunction();
    expectTypeOf(repository.findAll).toBeFunction();
  });

  it('ShippingLabelRepository interface のシグネチャを満たせる', () => {
    type ShippingLabel = { id: string };

    const repository: ShippingLabelRepository<ShippingLabel> = {
      findById: async (_labelId) => null,
      findByOrderId: async (_orderId) => [],
      save: async (_label) => undefined,
    };

    expectTypeOf(repository.findByOrderId).toBeFunction();
  });

  it('MessageTemplateRepository interface のシグネチャを満たせる', () => {
    type MessageTemplate = { type: string; content: string };

    const repository: MessageTemplateRepository<MessageTemplate> = {
      findByType: async (_type: MessageTemplateType) => null,
      save: async (_template: MessageTemplate) => undefined,
      resetToDefault: async (_type: MessageTemplateType) => ({ type: 'x', content: 'y' }),
    };

    expectTypeOf(repository.resetToDefault).toBeFunction();
  });

  it('ShippingLabelIssuer interface のシグネチャを満たせる', () => {
    type Order = { orderId: string };
    type ShippingLabel = { labelId: string };

    const issuer: ShippingLabelIssuer<Order, ShippingLabel> = {
      issue: async (_order: Order, _method: ShippingMethod) => ({ labelId: 'LBL-001' }),
    };

    expectTypeOf(issuer.issue).toBeFunction();
  });

  it('OrderFetcher interface のシグネチャを満たせる', async () => {
    const fetcher: OrderFetcher = {
      fetch: async (_orderId: OrderId, platform: Platform): Promise<PlatformOrderData> => ({
        orderId: 'ORD-001',
        platform,
        buyerName: '山田 太郎',
        buyerPostalCode: '1000001',
        buyerPrefecture: '東京都',
        buyerCity: '千代田区',
        buyerAddress1: '千代田1-1-1',
        productName: 'アクセサリー',
        orderedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    };

    const result = await fetcher.fetch(new OrderId('ORD-001'), Platform.Minne);
    expectTypeOf(result.orderId).toBeString();
  });

  it('NotificationSender interface のシグネチャを満たせる', async () => {
    const sender: NotificationSender = {
      notify: async (_message: Message) => undefined,
    };

    await sender.notify(new Message('新規注文があります'));
    expectTypeOf(sender.notify).toBeFunction();
  });
});
