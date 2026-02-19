import { describe, expect, it, vi } from 'vitest';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { Order } from '@/domain/entities/Order';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import { ClickPostGateway } from '../ClickPostGateway';
import { ShippingLabelIssuerImpl } from '../ShippingLabelIssuerImpl';
import { YamatoCompactGateway } from '../YamatoCompactGateway';

const orderFactory = new OrderFactory();

function createOrder(): Order {
  return orderFactory.createFromPlatformData({
    orderId: 'ORD-001',
    platform: Platform.Minne,
    buyerName: '山田 太郎',
    buyerPostalCode: '1000001',
    buyerPrefecture: '東京都',
    buyerCity: '千代田区',
    buyerAddress1: '千代田1-1',
    buyerPhone: '09012345678',
    productName: 'ハンドメイドアクセサリー',
    price: 2500,
    orderedAt: new Date('2026-02-20T00:00:00.000Z'),
  });
}

describe('ShippingLabelIssuerImpl', () => {
  it('click_post の場合は ClickPostGateway に振り分ける', async () => {
    const order = createOrder();
    const clickPostLabel = new ClickPostLabel({
      labelId: new LabelId('LBL-CP-001'),
      orderId: new OrderId('ORD-001'),
      pdfData: 'base64-pdf',
      trackingNumber: new TrackingNumber('CP123456789JP'),
      issuedAt: new Date('2026-02-21T00:00:00.000Z'),
    });

    const clickPostGateway: ClickPostGateway = {
      issue: vi.fn(async () => clickPostLabel),
    };
    const yamatoGateway: YamatoCompactGateway = {
      issue: vi.fn(async () => {
        throw new Error('should not be called');
      }),
    };

    const issuer = new ShippingLabelIssuerImpl(clickPostGateway, yamatoGateway);
    const result = await issuer.issue(order, ShippingMethod.ClickPost);

    expect(result).toBe(clickPostLabel);
    expect(clickPostGateway.issue).toHaveBeenCalledTimes(1);
    expect(clickPostGateway.issue).toHaveBeenCalledWith(order);
    expect(yamatoGateway.issue).not.toHaveBeenCalled();
  });

  it('yamato_compact の場合は YamatoCompactGateway に振り分ける', async () => {
    const order = createOrder();
    const yamatoLabel = new YamatoCompactLabel({
      labelId: new LabelId('LBL-YM-001'),
      orderId: new OrderId('ORD-001'),
      qrCode: 'qr-code',
      waybillNumber: 'YMT-1234-5678',
      issuedAt: new Date('2026-02-21T00:00:00.000Z'),
    });

    const clickPostGateway: ClickPostGateway = {
      issue: vi.fn(async () => {
        throw new Error('should not be called');
      }),
    };
    const yamatoGateway: YamatoCompactGateway = {
      issue: vi.fn(async () => yamatoLabel),
    };

    const issuer = new ShippingLabelIssuerImpl(clickPostGateway, yamatoGateway);
    const result = await issuer.issue(order, ShippingMethod.YamatoCompact);

    expect(result).toBe(yamatoLabel);
    expect(yamatoGateway.issue).toHaveBeenCalledTimes(1);
    expect(yamatoGateway.issue).toHaveBeenCalledWith(order);
    expect(clickPostGateway.issue).not.toHaveBeenCalled();
  });

  it('未知の ShippingMethod ではエラーを返す', async () => {
    const order = createOrder();
    const clickPostGateway: ClickPostGateway = {
      issue: vi.fn(async () => {
        throw new Error('should not be called');
      }),
    };
    const yamatoGateway: YamatoCompactGateway = {
      issue: vi.fn(async () => {
        throw new Error('should not be called');
      }),
    };

    const issuer = new ShippingLabelIssuerImpl(clickPostGateway, yamatoGateway);
    const unknownMethod = {
      toString: () => 'unknown_method',
    } as ShippingMethod;

    await expect(issuer.issue(order, unknownMethod)).rejects.toThrow(
      '未対応の配送方法です: unknown_method',
    );
    expect(clickPostGateway.issue).not.toHaveBeenCalled();
    expect(yamatoGateway.issue).not.toHaveBeenCalled();
  });
});
