import { describe, it, expect } from 'vitest';
import { Address } from '../Address';
import { PostalCode } from '../PostalCode';
import { Prefecture } from '../Prefecture';

describe('Address', () => {
  const validParams = {
    postalCode: new PostalCode('1000001'),
    prefecture: new Prefecture('東京都'),
    city: '千代田区',
    street: '千代田1-1',
  };

  it('必須項目で作成できる（DR-ADR-003）', () => {
    const address = new Address(validParams);
    expect(address.postalCode.value).toBe('1000001');
    expect(address.prefecture.value).toBe('東京都');
    expect(address.city).toBe('千代田区');
    expect(address.street).toBe('千代田1-1');
    expect(address.building).toBeUndefined();
  });

  it('建物名ありで作成できる', () => {
    const address = new Address({ ...validParams, building: 'テストビル3F' });
    expect(address.building).toBe('テストビル3F');
  });

  it('市区町村が空でエラーになる', () => {
    expect(() => new Address({ ...validParams, city: '' })).toThrow('市区町村は必須です');
  });

  it('番地が空でエラーになる', () => {
    expect(() => new Address({ ...validParams, street: '' })).toThrow('番地は必須です');
  });

  it('市区町村が空白のみでエラーになる', () => {
    expect(() => new Address({ ...validParams, city: '   ' })).toThrow('市区町村は必須です');
  });

  it('fullAddressで住所全体を返す', () => {
    const address = new Address(validParams);
    expect(address.fullAddress()).toBe('東京都千代田区千代田1-1');
  });

  it('fullAddressで建物名を含む', () => {
    const address = new Address({ ...validParams, building: 'テストビル3F' });
    expect(address.fullAddress()).toBe('東京都千代田区千代田1-1テストビル3F');
  });

  it('formatForLabelでラベル用フォーマットを返す', () => {
    const address = new Address(validParams);
    expect(address.formatForLabel()).toBe('〒100-0001\n東京都千代田区千代田1-1');
  });

  it('同じ値のAddressはequalsでtrueを返す', () => {
    const a1 = new Address(validParams);
    const a2 = new Address(validParams);
    expect(a1.equals(a2)).toBe(true);
  });

  it('異なる値のAddressはequalsでfalseを返す', () => {
    const a1 = new Address(validParams);
    const a2 = new Address({ ...validParams, city: '港区' });
    expect(a1.equals(a2)).toBe(false);
  });
});
