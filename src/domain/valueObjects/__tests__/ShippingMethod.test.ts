import { describe, it, expect } from 'vitest';
import { ShippingMethod } from '../ShippingMethod';

describe('ShippingMethod', () => {
  it('click_postを作成できる', () => {
    const method = new ShippingMethod('click_post');
    expect(method.value).toBe('click_post');
  });

  it('yamato_compactを作成できる', () => {
    const method = new ShippingMethod('yamato_compact');
    expect(method.value).toBe('yamato_compact');
  });

  it('静的インスタンスが正しい', () => {
    expect(ShippingMethod.ClickPost.value).toBe('click_post');
    expect(ShippingMethod.YamatoCompact.value).toBe('yamato_compact');
  });

  it('不正な配送方法でエラーになる（DR-SHP-001）', () => {
    expect(() => new ShippingMethod('sagawa')).toThrow('不正な配送方法です');
  });

  it('空文字でエラーになる', () => {
    expect(() => new ShippingMethod('')).toThrow('不正な配送方法です');
  });

  it('同じ値のShippingMethodはequalsでtrueを返す', () => {
    const m1 = new ShippingMethod('click_post');
    const m2 = new ShippingMethod('click_post');
    expect(m1.equals(m2)).toBe(true);
  });

  it('異なる値のShippingMethodはequalsでfalseを返す', () => {
    expect(ShippingMethod.ClickPost.equals(ShippingMethod.YamatoCompact)).toBe(false);
  });

  it('toStringで値を返す', () => {
    expect(ShippingMethod.ClickPost.toString()).toBe('click_post');
  });
});
