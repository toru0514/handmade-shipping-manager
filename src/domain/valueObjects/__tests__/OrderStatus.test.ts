import { describe, it, expect } from 'vitest';
import { OrderStatus } from '../OrderStatus';

describe('OrderStatus', () => {
  it('pendingを作成できる', () => {
    const status = new OrderStatus('pending');
    expect(status.value).toBe('pending');
  });

  it('shippedを作成できる', () => {
    const status = new OrderStatus('shipped');
    expect(status.value).toBe('shipped');
  });

  it('静的インスタンスが正しい', () => {
    expect(OrderStatus.Pending.value).toBe('pending');
    expect(OrderStatus.Shipped.value).toBe('shipped');
  });

  it('不正なステータスでエラーになる（DR-ORD-003）', () => {
    expect(() => new OrderStatus('cancelled')).toThrow('不正な注文ステータスです');
  });

  it('isPendingが正しく判定する', () => {
    expect(OrderStatus.Pending.isPending()).toBe(true);
    expect(OrderStatus.Shipped.isPending()).toBe(false);
  });

  it('isShippedが正しく判定する', () => {
    expect(OrderStatus.Shipped.isShipped()).toBe(true);
    expect(OrderStatus.Pending.isShipped()).toBe(false);
  });

  it('同じ値のOrderStatusはequalsでtrueを返す', () => {
    const s1 = new OrderStatus('pending');
    const s2 = new OrderStatus('pending');
    expect(s1.equals(s2)).toBe(true);
  });

  it('異なる値のOrderStatusはequalsでfalseを返す', () => {
    expect(OrderStatus.Pending.equals(OrderStatus.Shipped)).toBe(false);
  });

  it('toStringで値を返す', () => {
    expect(OrderStatus.Pending.toString()).toBe('pending');
  });
});
