import { describe, it, expect } from 'vitest';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

describe('ClickPostLabel', () => {
  it('クリックポスト伝票を作成できる', () => {
    const label = new ClickPostLabel({
      labelId: new LabelId('LBL-CP-001'),
      orderId: new OrderId('ORD-001'),
      pdfData: 'base64-pdf-data',
      trackingNumber: new TrackingNumber('123456789012'),
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(label.type).toBe('click_post');
    expect(label.status).toBe('issued');
    expect(label.pdfData).toBe('base64-pdf-data');
    expect(label.trackingNumber.value).toBe('123456789012');
    expect(label.isExpired(new Date('2030-01-01T00:00:00.000Z'))).toBe(false);
  });

  it('PDFデータが空ならエラーになる', () => {
    expect(
      () =>
        new ClickPostLabel({
          labelId: new LabelId('LBL-CP-001'),
          orderId: new OrderId('ORD-001'),
          pdfData: '   ',
          trackingNumber: new TrackingNumber('123456789012'),
        }),
    ).toThrow('PDFデータは空にできません');
  });
});
