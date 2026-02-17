import { describe, it, expect } from 'vitest';
import { PhoneNumber } from '../PhoneNumber';

describe('PhoneNumber', () => {
  it('固定電話番号を作成できる（10桁）', () => {
    const phone = new PhoneNumber('0312345678');
    expect(phone.value).toBe('0312345678');
  });

  it('携帯電話番号を作成できる（11桁）', () => {
    const phone = new PhoneNumber('09012345678');
    expect(phone.value).toBe('09012345678');
  });

  it('ハイフン付きでも作成できる', () => {
    const phone = new PhoneNumber('090-1234-5678');
    expect(phone.value).toBe('09012345678');
  });

  it('スペース付きでも作成できる', () => {
    const phone = new PhoneNumber('090 1234 5678');
    expect(phone.value).toBe('09012345678');
  });

  it('空文字でエラーになる', () => {
    expect(() => new PhoneNumber('')).toThrow('電話番号は空にできません');
  });

  it('0以外で始まるとエラーになる', () => {
    expect(() => new PhoneNumber('1234567890')).toThrow('不正な電話番号です');
  });

  it('桁数が不足するとエラーになる', () => {
    expect(() => new PhoneNumber('012345678')).toThrow('不正な電話番号です');
  });

  it('桁数が超過するとエラーになる', () => {
    expect(() => new PhoneNumber('090123456789')).toThrow('不正な電話番号です');
  });

  it('同じ値のPhoneNumberはequalsでtrueを返す', () => {
    const p1 = new PhoneNumber('09012345678');
    const p2 = new PhoneNumber('090-1234-5678');
    expect(p1.equals(p2)).toBe(true);
  });

  it('異なる値のPhoneNumberはequalsでfalseを返す', () => {
    const p1 = new PhoneNumber('09012345678');
    const p2 = new PhoneNumber('09087654321');
    expect(p1.equals(p2)).toBe(false);
  });
});
