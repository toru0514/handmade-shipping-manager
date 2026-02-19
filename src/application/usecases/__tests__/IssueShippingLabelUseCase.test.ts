import { describe, expect, it, vi } from 'vitest';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { Order } from '@/domain/entities/Order';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ShippingLabelIssuer } from '@/domain/ports/ShippingLabelIssuer';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import {
  InvalidLabelIssueInputError,
  InvalidLabelIssueOperationError,
  OrderNotFoundError,
} from '../IssueShippingLabelErrors';
import { IssueShippingLabelUseCase } from '../IssueShippingLabelUseCase';

class InMemoryOrderRepository implements OrderRepository<Order> {
  private readonly store = new Map<string, Order>();

  constructor(seedOrders: Order[] = []) {
    seedOrders.forEach((order) => {
      this.store.set(order.orderId.toString(), order);
    });
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

class InMemoryShippingLabelRepository implements ShippingLabelRepository<ShippingLabel> {
  private readonly labels: ShippingLabel[] = [];

  constructor(seedLabels: ShippingLabel[] = []) {
    this.labels = [...seedLabels];
  }

  async findById(labelId: LabelId): Promise<ShippingLabel | null> {
    return this.labels.find((label) => label.labelId.equals(labelId)) ?? null;
  }

  async findByOrderId(orderId: OrderId): Promise<ShippingLabel[]> {
    return this.labels.filter((label) => label.orderId.equals(orderId));
  }

  async save(label: ShippingLabel): Promise<void> {
    this.labels.push(label);
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

function createClickPostLabel(params: { labelId: string; orderId: string }): ClickPostLabel {
  return new ClickPostLabel({
    labelId: new LabelId(params.labelId),
    orderId: new OrderId(params.orderId),
    pdfData: 'base64-pdf',
    trackingNumber: new TrackingNumber('CP123456789JP'),
    issuedAt: new Date('2026-02-20T00:00:00.000Z'),
  });
}

describe('IssueShippingLabelUseCase', () => {
  it('pending 注文に伝票を発行し、保存できる', async () => {
    const order = createPendingOrder('ORD-001');
    const orderRepository = new InMemoryOrderRepository([order]);
    const labelRepository = new InMemoryShippingLabelRepository();
    const issuedLabel = createClickPostLabel({ labelId: 'LBL-001', orderId: 'ORD-001' });
    const issuer: ShippingLabelIssuer<Order, ShippingLabel> = {
      issue: vi.fn(async () => issuedLabel),
    };
    const useCase = new IssueShippingLabelUseCase(orderRepository, labelRepository, issuer);

    const result = await useCase.execute({
      orderId: 'ORD-001',
      shippingMethod: 'click_post',
    });

    expect(issuer.issue).toHaveBeenCalledTimes(1);
    expect(issuer.issue).toHaveBeenCalledWith(order, ShippingMethod.ClickPost);

    const saved = await labelRepository.findById(new LabelId('LBL-001'));
    expect(saved).not.toBeNull();

    expect(result.orderId).toBe('ORD-001');
    expect(result.labelId).toBe('LBL-001');
    expect(result.shippingMethod).toBe('click_post');
    expect(result.labelType).toBe('click_post');
    expect(result.status).toBe('issued');
    expect(result.warnings).toBeUndefined();
  });

  it('発送済み注文には伝票を発行できない（DR-LBL-002）', async () => {
    const order = createPendingOrder('ORD-002');
    order.markAsShipped(ShippingMethod.ClickPost, new TrackingNumber('CP123456789JP'));

    const orderRepository = new InMemoryOrderRepository([order]);
    const labelRepository = new InMemoryShippingLabelRepository();
    const issuer: ShippingLabelIssuer<Order, ShippingLabel> = {
      issue: vi.fn(async () => createClickPostLabel({ labelId: 'LBL-X', orderId: 'ORD-002' })),
    };
    const useCase = new IssueShippingLabelUseCase(orderRepository, labelRepository, issuer);

    await expect(
      useCase.execute({
        orderId: 'ORD-002',
        shippingMethod: 'click_post',
      }),
    ).rejects.toBeInstanceOf(InvalidLabelIssueOperationError);
    expect(issuer.issue).not.toHaveBeenCalled();
  });

  it('既存伝票がある場合は警告を返しつつ発行を継続する（DR-LBL-003）', async () => {
    const order = createPendingOrder('ORD-003');
    const existing = createClickPostLabel({ labelId: 'LBL-EXISTS', orderId: 'ORD-003' });
    const newLabel = createClickPostLabel({ labelId: 'LBL-NEW', orderId: 'ORD-003' });

    const orderRepository = new InMemoryOrderRepository([order]);
    const labelRepository = new InMemoryShippingLabelRepository([existing]);
    const issuer: ShippingLabelIssuer<Order, ShippingLabel> = {
      issue: vi.fn(async () => newLabel),
    };
    const useCase = new IssueShippingLabelUseCase(orderRepository, labelRepository, issuer);

    const result = await useCase.execute({
      orderId: 'ORD-003',
      shippingMethod: 'click_post',
    });

    expect(issuer.issue).toHaveBeenCalledTimes(1);
    expect(result.warnings).toEqual(['同一注文に既存の伝票があります（重複発行）']);
    expect(await labelRepository.findByOrderId(new OrderId('ORD-003'))).toHaveLength(2);
  });

  it('存在しない注文IDはエラーになる', async () => {
    const orderRepository = new InMemoryOrderRepository();
    const labelRepository = new InMemoryShippingLabelRepository();
    const issuer: ShippingLabelIssuer<Order, ShippingLabel> = {
      issue: vi.fn(async () => createClickPostLabel({ labelId: 'LBL-404', orderId: 'ORD-404' })),
    };
    const useCase = new IssueShippingLabelUseCase(orderRepository, labelRepository, issuer);

    await expect(
      useCase.execute({
        orderId: 'ORD-404',
        shippingMethod: 'click_post',
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
    expect(issuer.issue).not.toHaveBeenCalled();
  });

  it('不正な配送方法は入力エラーになる', async () => {
    const orderRepository = new InMemoryOrderRepository([createPendingOrder('ORD-005')]);
    const labelRepository = new InMemoryShippingLabelRepository();
    const issuer: ShippingLabelIssuer<Order, ShippingLabel> = {
      issue: vi.fn(async () => createClickPostLabel({ labelId: 'LBL-005', orderId: 'ORD-005' })),
    };
    const useCase = new IssueShippingLabelUseCase(orderRepository, labelRepository, issuer);

    await expect(
      useCase.execute({
        orderId: 'ORD-005',
        shippingMethod: 'invalid_method',
      }),
    ).rejects.toBeInstanceOf(InvalidLabelIssueInputError);
    expect(issuer.issue).not.toHaveBeenCalled();
  });

  it('伝票発行でエラーが起きた場合は例外が伝播し、保存されない', async () => {
    const order = createPendingOrder('ORD-006');
    const orderRepository = new InMemoryOrderRepository([order]);
    const labelRepository = new InMemoryShippingLabelRepository();
    const saveSpy = vi.spyOn(labelRepository, 'save');
    const issuer: ShippingLabelIssuer<Order, ShippingLabel> = {
      issue: vi.fn(async () => {
        throw new Error('外部APIエラー');
      }),
    };
    const useCase = new IssueShippingLabelUseCase(orderRepository, labelRepository, issuer);

    await expect(
      useCase.execute({
        orderId: 'ORD-006',
        shippingMethod: 'click_post',
      }),
    ).rejects.toThrow('外部APIエラー');
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
