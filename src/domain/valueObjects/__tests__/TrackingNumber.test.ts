import { describe, it, expect } from 'vitest';
import { TrackingNumber } from '../TrackingNumber';

describe('TrackingNumber', () => {
  it('有効な追跡番号を作成できる', () => {
    const tn = new TrackingNumber('1234567890');
    expect(tn.value).toBe('1234567890');
  });

  it('前後の空白がトリムされる', () => {
    const tn = new TrackingNumber('  1234567890  ');
    expect(tn.value).toBe('1234567890');
  });

  it('空文字でエラーになる', () => {
    expect(() => new TrackingNumber('')).toThrow('追跡番号は空にできません');
  });

  it('空白のみでエラーになる', () => {
    expect(() => new TrackingNumber('   ')).toThrow('追跡番号は空にできません');
  });

  it('同じ値のTrackingNumberはequalsでtrueを返す', () => {
    const t1 = new TrackingNumber('ABC123');
    const t2 = new TrackingNumber('ABC123');
    expect(t1.equals(t2)).toBe(true);
  });

  it('異なる値のTrackingNumberはequalsでfalseを返す', () => {
    const t1 = new TrackingNumber('ABC123');
    const t2 = new TrackingNumber('DEF456');
    expect(t1.equals(t2)).toBe(false);
  });

  it('toStringで値を返す', () => {
    const tn = new TrackingNumber('ABC123');
    expect(tn.toString()).toBe('ABC123');
  });
});
