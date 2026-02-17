import { describe, it, expect } from 'vitest';
import { PostalCode } from '../PostalCode';

describe('PostalCode', () => {
  it('7桁の数字で作成できる（DR-ADR-001）', () => {
    const code = new PostalCode('1234567');
    expect(code.value).toBe('1234567');
  });

  it('ハイフン付きでも作成できる', () => {
    const code = new PostalCode('123-4567');
    expect(code.value).toBe('1234567');
  });

  it('前後の空白がトリムされる', () => {
    const code = new PostalCode('  1234567  ');
    expect(code.value).toBe('1234567');
  });

  it('6桁でエラーになる', () => {
    expect(() => new PostalCode('123456')).toThrow('不正な郵便番号です');
  });

  it('8桁でエラーになる', () => {
    expect(() => new PostalCode('12345678')).toThrow('不正な郵便番号です');
  });

  it('数字以外を含むとエラーになる', () => {
    expect(() => new PostalCode('123456a')).toThrow('不正な郵便番号です');
  });

  it('空文字でエラーになる', () => {
    expect(() => new PostalCode('')).toThrow('不正な郵便番号です');
  });

  it('formattedでハイフン付きを返す', () => {
    const code = new PostalCode('1234567');
    expect(code.formatted()).toBe('123-4567');
  });

  it('同じ値のPostalCodeはequalsでtrueを返す', () => {
    const c1 = new PostalCode('1234567');
    const c2 = new PostalCode('123-4567');
    expect(c1.equals(c2)).toBe(true);
  });

  it('異なる値のPostalCodeはequalsでfalseを返す', () => {
    const c1 = new PostalCode('1234567');
    const c2 = new PostalCode('7654321');
    expect(c1.equals(c2)).toBe(false);
  });
});
