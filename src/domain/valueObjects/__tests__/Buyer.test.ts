import { describe, it, expect } from 'vitest';
import { Buyer } from '../Buyer';
import { BuyerName } from '../BuyerName';
import { Address } from '../Address';
import { PostalCode } from '../PostalCode';
import { Prefecture } from '../Prefecture';
import { PhoneNumber } from '../PhoneNumber';

describe('Buyer', () => {
  const address = new Address({
    postalCode: new PostalCode('1000001'),
    prefecture: new Prefecture('東京都'),
    city: '千代田区',
    street: '千代田1-1',
  });

  it('電話番号なしで作成できる', () => {
    const buyer = new Buyer({
      name: new BuyerName('田中太郎'),
      address,
    });
    expect(buyer.name.value).toBe('田中太郎');
    expect(buyer.address.city).toBe('千代田区');
    expect(buyer.phoneNumber).toBeUndefined();
  });

  it('電話番号ありで作成できる', () => {
    const buyer = new Buyer({
      name: new BuyerName('田中太郎'),
      address,
      phoneNumber: new PhoneNumber('09012345678'),
    });
    expect(buyer.phoneNumber?.value).toBe('09012345678');
  });

  it('電話番号なし同士のequalsがtrueを返す', () => {
    const b1 = new Buyer({ name: new BuyerName('田中太郎'), address });
    const b2 = new Buyer({ name: new BuyerName('田中太郎'), address });
    expect(b1.equals(b2)).toBe(true);
  });

  it('電話番号あり同士のequalsがtrueを返す', () => {
    const phone = new PhoneNumber('09012345678');
    const b1 = new Buyer({ name: new BuyerName('田中太郎'), address, phoneNumber: phone });
    const b2 = new Buyer({ name: new BuyerName('田中太郎'), address, phoneNumber: phone });
    expect(b1.equals(b2)).toBe(true);
  });

  it('名前が異なるとequalsがfalseを返す', () => {
    const b1 = new Buyer({ name: new BuyerName('田中太郎'), address });
    const b2 = new Buyer({ name: new BuyerName('佐藤花子'), address });
    expect(b1.equals(b2)).toBe(false);
  });

  it('電話番号の有無が異なるとequalsがfalseを返す', () => {
    const b1 = new Buyer({ name: new BuyerName('田中太郎'), address });
    const b2 = new Buyer({
      name: new BuyerName('田中太郎'),
      address,
      phoneNumber: new PhoneNumber('09012345678'),
    });
    expect(b1.equals(b2)).toBe(false);
  });
});
