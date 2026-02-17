import { describe, it, expect } from 'vitest';
import { Product } from '../Product';

describe('Product', () => {
  it('有効な商品を作成できる', () => {
    const product = new Product({ name: 'ハンドメイドピアス', price: 1500 });
    expect(product.name).toBe('ハンドメイドピアス');
    expect(product.price).toBe(1500);
  });

  it('価格0で作成できる', () => {
    const product = new Product({ name: 'サンプル品', price: 0 });
    expect(product.price).toBe(0);
  });

  it('商品名の前後の空白がトリムされる', () => {
    const product = new Product({ name: '  ハンドメイドピアス  ', price: 1500 });
    expect(product.name).toBe('ハンドメイドピアス');
  });

  it('商品名が空文字でエラーになる', () => {
    expect(() => new Product({ name: '', price: 1500 })).toThrow('商品名は空にできません');
  });

  it('商品名が空白のみでエラーになる', () => {
    expect(() => new Product({ name: '   ', price: 1500 })).toThrow('商品名は空にできません');
  });

  it('価格が負でエラーになる', () => {
    expect(() => new Product({ name: 'テスト', price: -1 })).toThrow(
      '価格は0以上で入力してください',
    );
  });

  it('同じ値のProductはequalsでtrueを返す', () => {
    const p1 = new Product({ name: 'ピアス', price: 1500 });
    const p2 = new Product({ name: 'ピアス', price: 1500 });
    expect(p1.equals(p2)).toBe(true);
  });

  it('名前が異なるとequalsでfalseを返す', () => {
    const p1 = new Product({ name: 'ピアス', price: 1500 });
    const p2 = new Product({ name: 'ネックレス', price: 1500 });
    expect(p1.equals(p2)).toBe(false);
  });

  it('価格が異なるとequalsでfalseを返す', () => {
    const p1 = new Product({ name: 'ピアス', price: 1500 });
    const p2 = new Product({ name: 'ピアス', price: 2000 });
    expect(p1.equals(p2)).toBe(false);
  });
});
