import { describe, it, expect } from 'vitest';
import { OrderId } from '../OrderId';

describe('OrderId', () => {
  it('有効な注文IDを作成できる', () => {
    const id = new OrderId('ORD-12345');
    expect(id.value).toBe('ORD-12345');
  });

  it('前後の空白がトリムされる', () => {
    const id = new OrderId('  ORD-12345  ');
    expect(id.value).toBe('ORD-12345');
  });

  it('空文字でエラーになる', () => {
    expect(() => new OrderId('')).toThrow('注文IDは空にできません');
  });

  it('空白のみでエラーになる', () => {
    expect(() => new OrderId('   ')).toThrow('注文IDは空にできません');
  });

  it('同じ値のOrderIdはequalsでtrueを返す', () => {
    const id1 = new OrderId('ORD-001');
    const id2 = new OrderId('ORD-001');
    expect(id1.equals(id2)).toBe(true);
  });

  it('異なる値のOrderIdはequalsでfalseを返す', () => {
    const id1 = new OrderId('ORD-001');
    const id2 = new OrderId('ORD-002');
    expect(id1.equals(id2)).toBe(false);
  });

  it('toStringで値を返す', () => {
    const id = new OrderId('ORD-12345');
    expect(id.toString()).toBe('ORD-12345');
  });
});
