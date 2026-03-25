import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncOrdersToDbUseCase } from '../SyncOrdersToDbUseCase';
import type { OrderSyncRepository } from '@/domain/ports/OrderSyncRepository';
import type { OrderRepository } from '@/domain/ports/OrderRepository';
import type { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { Order } from '@/domain/entities/Order';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
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

describe('SyncOrdersToDbUseCase', () => {
  let mockOrderRepository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByStatus: ReturnType<typeof vi.fn>;
    findByBuyerName: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    saveAll: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };
  let mockLabelRepository: {
    findById: ReturnType<typeof vi.fn>;
    findByOrderId: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    saveAll: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };
  let mockSyncRepository: {
    upsertOrders: ReturnType<typeof vi.fn>;
    upsertShippingLabels: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockOrderRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findByStatus: vi.fn(),
      findByBuyerName: vi.fn(),
      save: vi.fn(),
      saveAll: vi.fn(),
      exists: vi.fn(),
    };
    mockLabelRepository = {
      findById: vi.fn(),
      findByOrderId: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      saveAll: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
    };
    mockSyncRepository = {
      upsertOrders: vi.fn().mockResolvedValue({ synced: 0, errors: [] }),
      upsertShippingLabels: vi.fn().mockResolvedValue({ synced: 0, errors: [] }),
    };
  });

  it('注文と伝票を同期する', async () => {
    const order = createTestOrder();
    const label = createTestLabel();

    mockOrderRepository.findAll.mockResolvedValue([order]);
    mockLabelRepository.findByOrderId.mockResolvedValue([label]);
    mockSyncRepository.upsertOrders.mockResolvedValue({ synced: 1, errors: [] });
    mockSyncRepository.upsertShippingLabels.mockResolvedValue({ synced: 1, errors: [] });

    const useCase = new SyncOrdersToDbUseCase(
      mockOrderRepository as unknown as OrderRepository,
      mockLabelRepository as unknown as ShippingLabelRepository<ShippingLabel>,
      mockSyncRepository as unknown as OrderSyncRepository,
    );
    const result = await useCase.execute();

    expect(result.ordersSynced).toBe(1);
    expect(result.labelsSynced).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('注文がない場合はゼロを返す', async () => {
    const useCase = new SyncOrdersToDbUseCase(
      mockOrderRepository as unknown as OrderRepository,
      mockLabelRepository as unknown as ShippingLabelRepository<ShippingLabel>,
      mockSyncRepository as unknown as OrderSyncRepository,
    );
    const result = await useCase.execute();

    expect(result.ordersSynced).toBe(0);
    expect(result.labelsSynced).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('エラーを集約して返す', async () => {
    const order = createTestOrder();
    mockOrderRepository.findAll.mockResolvedValue([order]);
    mockSyncRepository.upsertOrders.mockResolvedValue({
      synced: 0,
      errors: ['orders upsert failed: DB error'],
    });

    const useCase = new SyncOrdersToDbUseCase(
      mockOrderRepository as unknown as OrderRepository,
      mockLabelRepository as unknown as ShippingLabelRepository<ShippingLabel>,
      mockSyncRepository as unknown as OrderSyncRepository,
    );
    const result = await useCase.execute();

    expect(result.ordersSynced).toBe(0);
    expect(result.errors).toContain('orders upsert failed: DB error');
  });
});
