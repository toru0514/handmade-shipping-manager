import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestoreFromDbUseCase } from '../RestoreFromDbUseCase';
import { Order } from '@/domain/entities/Order';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import { Buyer } from '@/domain/valueObjects/Buyer';
import { BuyerName } from '@/domain/valueObjects/BuyerName';
import { Address } from '@/domain/valueObjects/Address';
import { PostalCode } from '@/domain/valueObjects/PostalCode';
import { Prefecture } from '@/domain/valueObjects/Prefecture';
import { Product } from '@/domain/valueObjects/Product';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import type { MessageTemplate } from '@/domain/services/MessageGenerator';

function createTestOrder(id = 'ORD-001') {
  return Order.create({
    orderId: new OrderId(id),
    platform: new Platform('minne'),
    buyer: new Buyer({
      name: new BuyerName('テスト太郎'),
      address: new Address({
        postalCode: new PostalCode('1000001'),
        prefecture: new Prefecture('東京都'),
        city: '千代田区',
        street: '1-1-1',
      }),
    }),
    product: new Product({ name: 'テスト商品', price: 1000 }),
  });
}

function createTestLabel(orderId = 'ORD-001') {
  return new ClickPostLabel({
    labelId: new LabelId('LBL-001'),
    orderId: new OrderId(orderId),
    pdfData: 'base64pdf',
    trackingNumber: new TrackingNumber('1234567890'),
  });
}

function createTestTemplate(): MessageTemplate {
  return {
    id: 'tmpl-001',
    type: new MessageTemplateType('purchase_thanks'),
    content: 'ありがとうございます、{buyer_name}様',
    variables: [{ name: 'buyer_name' }],
  };
}

function createMockOrderRepo() {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    findByStatus: vi.fn(),
    findByBuyerName: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn(),
  };
}

function createMockLabelRepo() {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    findByOrderId: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockTemplateRepo() {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findByType: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn().mockResolvedValue(undefined),
    resetToDefault: vi.fn(),
  };
}

describe('RestoreFromDbUseCase', () => {
  let sourceOrderRepo: ReturnType<typeof createMockOrderRepo>;
  let targetOrderRepo: ReturnType<typeof createMockOrderRepo>;
  let sourceLabelRepo: ReturnType<typeof createMockLabelRepo>;
  let targetLabelRepo: ReturnType<typeof createMockLabelRepo>;
  let sourceTemplateRepo: ReturnType<typeof createMockTemplateRepo>;
  let targetTemplateRepo: ReturnType<typeof createMockTemplateRepo>;
  let useCase: RestoreFromDbUseCase;

  beforeEach(() => {
    sourceOrderRepo = createMockOrderRepo();
    targetOrderRepo = createMockOrderRepo();
    sourceLabelRepo = createMockLabelRepo();
    targetLabelRepo = createMockLabelRepo();
    sourceTemplateRepo = createMockTemplateRepo();
    targetTemplateRepo = createMockTemplateRepo();

    useCase = new RestoreFromDbUseCase(
      sourceOrderRepo,
      targetOrderRepo,
      sourceLabelRepo,
      targetLabelRepo,
      sourceTemplateRepo,
      targetTemplateRepo,
    );
  });

  it('注文 → 伝票 → テンプレートの順に復元する', async () => {
    const order = createTestOrder();
    const label = createTestLabel();
    const template = createTestTemplate();

    sourceOrderRepo.findAll.mockResolvedValue([order]);
    sourceLabelRepo.findAll.mockResolvedValue([label]);
    sourceTemplateRepo.findAll.mockResolvedValue([template]);

    const callOrder: string[] = [];
    targetOrderRepo.saveAll.mockImplementation(async () => {
      callOrder.push('orders');
    });
    targetLabelRepo.saveAll.mockImplementation(async () => {
      callOrder.push('shippingLabels');
    });
    targetTemplateRepo.saveAll.mockImplementation(async () => {
      callOrder.push('messageTemplates');
    });

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.restoredCounts).toEqual({
      orders: 1,
      shippingLabels: 1,
      messageTemplates: 1,
    });
    expect(callOrder).toEqual(['orders', 'shippingLabels', 'messageTemplates']);
  });

  it('注文復元でエラーが起きると後続ステップは実行されない', async () => {
    sourceOrderRepo.findAll.mockRejectedValue(new Error('DB接続エラー'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('orders');
    expect(result.error).toBe('DB接続エラー');
    expect(result.restoredCounts).toEqual({
      orders: 0,
      shippingLabels: 0,
      messageTemplates: 0,
    });
    expect(sourceLabelRepo.findAll).not.toHaveBeenCalled();
    expect(sourceTemplateRepo.findAll).not.toHaveBeenCalled();
  });

  it('伝票復元でエラーが起きると注文は復元済みだがテンプレートは実行されない', async () => {
    const order = createTestOrder();
    sourceOrderRepo.findAll.mockResolvedValue([order]);
    sourceLabelRepo.findAll.mockRejectedValue(new Error('伝票取得エラー'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('shippingLabels');
    expect(result.error).toBe('伝票取得エラー');
    expect(result.restoredCounts.orders).toBe(1);
    expect(result.restoredCounts.shippingLabels).toBe(0);
    expect(result.restoredCounts.messageTemplates).toBe(0);
    expect(sourceTemplateRepo.findAll).not.toHaveBeenCalled();
  });

  it('テンプレート復元でエラーが起きると注文と伝票は復元済み', async () => {
    const order = createTestOrder();
    const label = createTestLabel();
    sourceOrderRepo.findAll.mockResolvedValue([order]);
    sourceLabelRepo.findAll.mockResolvedValue([label]);
    sourceTemplateRepo.findAll.mockRejectedValue(new Error('テンプレートエラー'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('messageTemplates');
    expect(result.error).toBe('テンプレートエラー');
    expect(result.restoredCounts.orders).toBe(1);
    expect(result.restoredCounts.shippingLabels).toBe(1);
    expect(result.restoredCounts.messageTemplates).toBe(0);
  });

  it('全ステップ成功時にカウントを返す', async () => {
    const orders = [createTestOrder('ORD-001'), createTestOrder('ORD-002')];
    const labels = [createTestLabel('ORD-001')];
    const templates = [createTestTemplate()];

    sourceOrderRepo.findAll.mockResolvedValue(orders);
    sourceLabelRepo.findAll.mockResolvedValue(labels);
    sourceTemplateRepo.findAll.mockResolvedValue(templates);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.failedStep).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.restoredCounts).toEqual({
      orders: 2,
      shippingLabels: 1,
      messageTemplates: 1,
    });
  });

  it('データが空の場合は saveAll を呼ばない', async () => {
    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.restoredCounts).toEqual({
      orders: 0,
      shippingLabels: 0,
      messageTemplates: 0,
    });
    expect(targetOrderRepo.saveAll).not.toHaveBeenCalled();
    expect(targetLabelRepo.saveAll).not.toHaveBeenCalled();
    expect(targetTemplateRepo.saveAll).not.toHaveBeenCalled();
  });
});
