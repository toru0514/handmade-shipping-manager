import { describe, it, expect } from 'vitest';
import { BuyerName } from '../BuyerName';

describe('BuyerName', () => {
  it('有効な購入者名を作成できる', () => {
    const name = new BuyerName('田中太郎');
    expect(name.value).toBe('田中太郎');
  });

  it('前後の空白がトリムされる', () => {
    const name = new BuyerName('  田中太郎  ');
    expect(name.value).toBe('田中太郎');
  });

  it('空文字でエラーになる', () => {
    expect(() => new BuyerName('')).toThrow('購入者名は空にできません');
  });

  it('空白のみでエラーになる', () => {
    expect(() => new BuyerName('   ')).toThrow('購入者名は空にできません');
  });

  it('100文字ちょうどは許可される', () => {
    const name = new BuyerName('あ'.repeat(100));
    expect(name.value).toHaveLength(100);
  });

  it('101文字でエラーになる', () => {
    expect(() => new BuyerName('あ'.repeat(101))).toThrow('100文字以内で入力してください');
  });

  it('同じ値のBuyerNameはequalsでtrueを返す', () => {
    const n1 = new BuyerName('田中太郎');
    const n2 = new BuyerName('田中太郎');
    expect(n1.equals(n2)).toBe(true);
  });

  it('異なる値のBuyerNameはequalsでfalseを返す', () => {
    const n1 = new BuyerName('田中太郎');
    const n2 = new BuyerName('佐藤花子');
    expect(n1.equals(n2)).toBe(false);
  });

  it('toStringで値を返す', () => {
    const name = new BuyerName('田中太郎');
    expect(name.toString()).toBe('田中太郎');
  });
});
