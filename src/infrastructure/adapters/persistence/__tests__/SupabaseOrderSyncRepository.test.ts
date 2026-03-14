import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseOrderSyncRepository } from '../SupabaseOrderSyncRepository';
import { Order } from '@/domain/entities/Order';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
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

function createMockSupabase() {
  const upsertFn = vi.fn().mockResolvedValue({ error: null });
  const fromFn = vi.fn().mockReturnValue({ upsert: upsertFn });
  return { from: fromFn, upsert: upsertFn };
}

describe('SupabaseOrderSyncRepository', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let repository: SupabaseOrderSyncRepository;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new SupabaseOrderSyncRepository(mockSupabase as any);
  });

  describe('upsertOrders', () => {
    it('空の配列の場合は何もしない', async () => {
      const result = await repository.upsertOrders([]);
      expect(result).toEqual({ synced: 0, errors: [] });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('注文を upsert する', async () => {
      const order = createTestOrder();
      const result = await repository.upsertOrders([order]);

      expect(result.synced).toBe(1);
      expect(result.errors).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            order_id: 'ORD-001',
            platform: 'minne',
            buyer_name: 'テスト太郎',
            product_name: 'テスト商品',
            product_price: 1000,
            products_json: [{ name: 'テスト商品', price: 1000, quantity: 1 }],
            status: 'pending',
          }),
        ]),
        { onConflict: 'order_id' },
      );
    });

    it('upsert エラー時はエラーを返す', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: { message: 'DB error' } });
      const order = createTestOrder();
      const result = await repository.upsertOrders([order]);

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('DB error');
    });
  });

  describe('upsertShippingLabels', () => {
    it('空の配列の場合は何もしない', async () => {
      const result = await repository.upsertShippingLabels([]);
      expect(result).toEqual({ synced: 0, errors: [] });
    });

    it('ClickPostLabel を upsert する', async () => {
      const label = new ClickPostLabel({
        labelId: new LabelId('LBL-001'),
        orderId: new OrderId('ORD-001'),
        pdfData: 'base64pdf',
        trackingNumber: new TrackingNumber('1234567890'),
      });

      const result = await repository.upsertShippingLabels([label]);

      expect(result.synced).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('shipping_labels');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label_id: 'LBL-001',
            type: 'click_post',
            click_post_pdf_data: 'base64pdf',
            click_post_tracking_number: '1234567890',
          }),
        ]),
        { onConflict: 'label_id' },
      );
    });

    it('YamatoCompactLabel を upsert する', async () => {
      const label = new YamatoCompactLabel({
        labelId: new LabelId('LBL-002'),
        orderId: new OrderId('ORD-001'),
        qrCode: 'qr-data',
        waybillNumber: 'WB-001',
      });

      const result = await repository.upsertShippingLabels([label]);

      expect(result.synced).toBe(1);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label_id: 'LBL-002',
            type: 'yamato_compact',
            yamato_qr_code: 'qr-data',
            yamato_waybill_number: 'WB-001',
          }),
        ]),
        { onConflict: 'label_id' },
      );
    });
  });
});
