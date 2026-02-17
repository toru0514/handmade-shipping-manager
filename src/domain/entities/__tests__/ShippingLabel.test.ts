import { describe, it, expect } from 'vitest';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';

describe('ShippingLabel', () => {
  it('Order と ID参照で紐づく', () => {
    const orderId = new OrderId('ORD-001');
    const label = new ShippingLabel({
      labelId: new LabelId('LBL-001'),
      orderId,
      type: 'click_post',
    });

    expect(label.orderId).toBe(orderId);
    expect(label.orderId.value).toBe('ORD-001');
  });

  it('expiresAt が未設定なら isExpired は false', () => {
    const label = new ShippingLabel({
      labelId: new LabelId('LBL-001'),
      orderId: new OrderId('ORD-001'),
      type: 'click_post',
    });

    expect(label.isExpired()).toBe(false);
  });

  it('expiresAt を過ぎていれば isExpired は true', () => {
    const label = new ShippingLabel({
      labelId: new LabelId('LBL-001'),
      orderId: new OrderId('ORD-001'),
      type: 'yamato_compact',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    expect(label.isExpired(new Date('2026-01-15T00:00:00.001Z'))).toBe(true);
  });

  it('expiresAt 以前なら isExpired は false', () => {
    const label = new ShippingLabel({
      labelId: new LabelId('LBL-001'),
      orderId: new OrderId('ORD-001'),
      type: 'yamato_compact',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    expect(label.isExpired(new Date('2026-01-14T23:59:59.999Z'))).toBe(false);
  });
});
