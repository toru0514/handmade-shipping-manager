import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseOrderRepository } from '../SupabaseOrderRepository';
import { Order } from '@/domain/entities/Order';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { Buyer } from '@/domain/valueObjects/Buyer';
import { BuyerName } from '@/domain/valueObjects/BuyerName';
import { Address } from '@/domain/valueObjects/Address';
import { PostalCode } from '@/domain/valueObjects/PostalCode';
import { Prefecture } from '@/domain/valueObjects/Prefecture';
import { Product } from '@/domain/valueObjects/Product';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

function createTestOrder(
  overrides: Partial<{
    orderId: string;
    status: string;
    buyerName: string;
    shippedAt: Date;
    shippingMethod: string;
    trackingNumber: string;
  }> = {},
): Order {
  return Order.reconstitute({
    orderId: new OrderId(overrides.orderId ?? 'M-test-001'),
    platform: new Platform('minne'),
    buyer: new Buyer({
      name: new BuyerName(overrides.buyerName ?? 'テスト太郎'),
      address: new Address({
        postalCode: new PostalCode('1000001'),
        prefecture: new Prefecture('東京都'),
        city: '千代田区',
        street: '1-1-1',
      }),
    }),
    products: [new Product({ name: 'テスト商品', price: 1000, quantity: 1 })],
    status: new OrderStatus(overrides.status ?? 'pending'),
    orderedAt: new Date('2026-01-01T00:00:00Z'),
    shortProductName: 'テスト商品',
    shippedAt: overrides.shippedAt,
    shippingMethod: overrides.shippingMethod
      ? new ShippingMethod(overrides.shippingMethod)
      : undefined,
    trackingNumber: overrides.trackingNumber
      ? new TrackingNumber(overrides.trackingNumber)
      : undefined,
  });
}

function createOrderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    order_id: 'M-test-001',
    platform: 'minne',
    buyer_name: 'テスト太郎',
    buyer_postal_code: '1000001',
    buyer_prefecture: '東京都',
    buyer_city: '千代田区',
    buyer_street: '1-1-1',
    buyer_building: '',
    buyer_phone: '',
    product_name: 'テスト商品',
    product_price: 1000,
    products_json: [{ name: 'テスト商品', price: 1000, quantity: 1 }],
    status: 'pending',
    ordered_at: '2026-01-01T00:00:00.000Z',
    shipped_at: null,
    shipping_method: null,
    tracking_number: null,
    short_product_name: 'テスト商品',
    synced_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockSupabase() {
  const singleFn = vi.fn();
  const ilikeFn = vi.fn().mockReturnValue({ data: [], error: null });
  const eqFn = vi.fn().mockImplementation(() => ({
    single: singleFn,
    // eq returning array-like result (for findByStatus)
    then: undefined,
    data: [],
    error: null,
  }));
  const selectFn = vi.fn().mockImplementation(() => ({
    eq: eqFn,
    ilike: ilikeFn,
    // For findAll (no filter)
    data: [],
    error: null,
  }));
  const upsertFn = vi.fn().mockResolvedValue({ error: null });
  const fromFn = vi.fn().mockImplementation(() => ({
    select: selectFn,
    upsert: upsertFn,
  }));

  return {
    from: fromFn,
    select: selectFn,
    eq: eqFn,
    single: singleFn,
    upsert: upsertFn,
    ilike: ilikeFn,
  };
}

describe('SupabaseOrderRepository', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let repository: SupabaseOrderRepository;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new SupabaseOrderRepository(mockSupabase as any);
  });

  describe('save', () => {
    it('orders テーブルに upsert する', async () => {
      const order = createTestOrder();
      await repository.save(order);

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'M-test-001',
          platform: 'minne',
          buyer_name: 'テスト太郎',
          product_name: 'テスト商品',
          product_price: 1000,
          products_json: [{ name: 'テスト商品', price: 1000, quantity: 1 }],
          status: 'pending',
        }),
        { onConflict: 'order_id' },
      );
    });

    it('upsert エラー時は例外を投げる', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: { message: 'DB error' } });
      const order = createTestOrder();

      await expect(repository.save(order)).rejects.toThrow('Order save failed: DB error');
    });
  });

  describe('saveAll', () => {
    it('複数の注文をバッチ upsert する', async () => {
      const orders = [
        createTestOrder({ orderId: 'M-test-001' }),
        createTestOrder({ orderId: 'M-test-002' }),
      ];
      await repository.saveAll(orders);

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ order_id: 'M-test-001' }),
          expect.objectContaining({ order_id: 'M-test-002' }),
        ]),
        { onConflict: 'order_id' },
      );
    });

    it('空配列の場合は upsert を呼ばない', async () => {
      await repository.saveAll([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('upsert エラー時は例外を投げる', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: { message: 'Batch error' } });
      const orders = [createTestOrder()];

      await expect(repository.saveAll(orders)).rejects.toThrow('Order saveAll failed: Batch error');
    });
  });

  describe('findById', () => {
    it('order_id で検索して Order を返す', async () => {
      const row = createOrderRow();
      mockSupabase.single.mockResolvedValue({ data: row, error: null });

      const result = await repository.findById(new OrderId('M-test-001'));

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('order_id', 'M-test-001');
      expect(result).not.toBeNull();
      expect(result!.orderId.toString()).toBe('M-test-001');
      expect(result!.buyer.name.toString()).toBe('テスト太郎');
      expect(result!.products).toHaveLength(1);
      expect(result!.products[0].name).toBe('テスト商品');
    });

    it('見つからない場合は null を返す', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await repository.findById(new OrderId('M-not-exist'));
      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('status で検索して Order[] を返す', async () => {
      const rows = [createOrderRow(), createOrderRow({ order_id: 'M-test-002' })];
      mockSupabase.eq.mockReturnValue({ data: rows, error: null });

      const result = await repository.findByStatus(OrderStatus.Pending);

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending');
      expect(result).toHaveLength(2);
    });

    it('エラー時は空配列を返す', async () => {
      mockSupabase.eq.mockReturnValue({ data: null, error: { message: 'error' } });

      const result = await repository.findByStatus(OrderStatus.Pending);
      expect(result).toEqual([]);
    });
  });

  describe('findByBuyerName', () => {
    it('buyer_name の ilike 部分一致で検索する', async () => {
      const rows = [createOrderRow()];
      mockSupabase.ilike.mockReturnValue({ data: rows, error: null });

      const result = await repository.findByBuyerName('テスト');

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.ilike).toHaveBeenCalledWith('buyer_name', '%テスト%');
      expect(result).toHaveLength(1);
      expect(result[0].buyer.name.toString()).toBe('テスト太郎');
    });

    it('エラー時は空配列を返す', async () => {
      mockSupabase.ilike.mockReturnValue({ data: null, error: { message: 'error' } });

      const result = await repository.findByBuyerName('テスト');
      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('全注文を返す', async () => {
      const rows = [createOrderRow(), createOrderRow({ order_id: 'M-test-002' })];
      mockSupabase.select.mockReturnValue({ data: rows, error: null });

      const result = await repository.findAll();

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(result).toHaveLength(2);
    });

    it('エラー時は空配列を返す', async () => {
      mockSupabase.select.mockReturnValue({ data: null, error: { message: 'error' } });

      const result = await repository.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('exists', () => {
    it('注文が存在する場合は true を返す', async () => {
      const row = createOrderRow();
      mockSupabase.single.mockResolvedValue({ data: row, error: null });

      const result = await repository.exists(new OrderId('M-test-001'));
      expect(result).toBe(true);
    });

    it('注文が存在しない場合は false を返す', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await repository.exists(new OrderId('M-not-exist'));
      expect(result).toBe(false);
    });
  });

  describe('fromRow (products_json からの復元)', () => {
    it('products_json がある場合は複数商品を復元する', async () => {
      const row = createOrderRow({
        products_json: [
          { name: '商品A', price: 500, quantity: 2 },
          { name: '商品B', price: 1500, quantity: 1 },
        ],
        product_name: '商品A、商品B',
        product_price: 2500,
      });
      mockSupabase.single.mockResolvedValue({ data: row, error: null });

      const result = await repository.findById(new OrderId('M-test-001'));

      expect(result).not.toBeNull();
      expect(result!.products).toHaveLength(2);
      expect(result!.products[0].name).toBe('商品A');
      expect(result!.products[0].price).toBe(500);
      expect(result!.products[0].quantity).toBe(2);
      expect(result!.products[1].name).toBe('商品B');
    });

    it('products_json が null の場合は product_name/product_price から復元する', async () => {
      const row = createOrderRow({
        products_json: null,
        product_name: 'フォールバック商品',
        product_price: 2000,
      });
      mockSupabase.single.mockResolvedValue({ data: row, error: null });

      const result = await repository.findById(new OrderId('M-test-001'));

      expect(result).not.toBeNull();
      expect(result!.products).toHaveLength(1);
      expect(result!.products[0].name).toBe('フォールバック商品');
      expect(result!.products[0].price).toBe(2000);
    });

    it('発送済み注文の全フィールドを復元する', async () => {
      const row = createOrderRow({
        status: 'shipped',
        shipped_at: '2026-01-05T10:00:00.000Z',
        shipping_method: 'click_post',
        tracking_number: '1234567890',
      });
      mockSupabase.single.mockResolvedValue({ data: row, error: null });

      const result = await repository.findById(new OrderId('M-test-001'));

      expect(result).not.toBeNull();
      expect(result!.status.toString()).toBe('shipped');
      expect(result!.shippedAt).toEqual(new Date('2026-01-05T10:00:00.000Z'));
      expect(result!.shippingMethod!.toString()).toBe('click_post');
      expect(result!.trackingNumber!.toString()).toBe('1234567890');
    });
  });
});
