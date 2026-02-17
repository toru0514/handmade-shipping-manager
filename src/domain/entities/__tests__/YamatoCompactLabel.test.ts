import { describe, it, expect } from 'vitest';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';

describe('YamatoCompactLabel', () => {
  it('宅急便コンパクト伝票を作成できる', () => {
    const issuedAt = new Date('2026-01-01T00:00:00.000Z');
    const label = new YamatoCompactLabel({
      labelId: new LabelId('LBL-YM-001'),
      orderId: new OrderId('ORD-001'),
      qrCode: 'qr-code-data',
      waybillNumber: '1234-5678-9012',
      issuedAt,
    });

    expect(label.type).toBe('yamato_compact');
    expect(label.status).toBe('issued');
    expect(label.qrCode).toBe('qr-code-data');
    expect(label.waybillNumber).toBe('1234-5678-9012');
    expect(label.expiresAt?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('発行から13日後は有効（DR-LBL-001）', () => {
    const label = new YamatoCompactLabel({
      labelId: new LabelId('LBL-YM-001'),
      orderId: new OrderId('ORD-001'),
      qrCode: 'qr-code-data',
      waybillNumber: '1234-5678-9012',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(label.isExpired(new Date('2026-01-14T23:59:59.999Z'))).toBe(false);
  });

  it('発行から14日を過ぎると期限切れ（DR-LBL-001）', () => {
    const label = new YamatoCompactLabel({
      labelId: new LabelId('LBL-YM-001'),
      orderId: new OrderId('ORD-001'),
      qrCode: 'qr-code-data',
      waybillNumber: '1234-5678-9012',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(label.isExpired(new Date('2026-01-15T00:00:00.001Z'))).toBe(true);
  });

  it('QRコードが空ならエラーになる', () => {
    expect(
      () =>
        new YamatoCompactLabel({
          labelId: new LabelId('LBL-YM-001'),
          orderId: new OrderId('ORD-001'),
          qrCode: ' ',
          waybillNumber: '1234-5678-9012',
        }),
    ).toThrow('QRコードは空にできません');
  });

  it('送り状番号が空ならエラーになる', () => {
    expect(
      () =>
        new YamatoCompactLabel({
          labelId: new LabelId('LBL-YM-001'),
          orderId: new OrderId('ORD-001'),
          qrCode: 'qr-code-data',
          waybillNumber: ' ',
        }),
    ).toThrow('送り状番号は空にできません');
  });
});
