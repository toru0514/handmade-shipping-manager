import { describe, it, expect } from 'vitest';
import { Prefecture, PREFECTURES } from '../Prefecture';

describe('Prefecture', () => {
  it('有効な都道府県を作成できる（DR-ADR-002）', () => {
    const pref = new Prefecture('東京都');
    expect(pref.value).toBe('東京都');
  });

  it('47都道府県すべて作成できる', () => {
    for (const name of PREFECTURES) {
      const pref = new Prefecture(name);
      expect(pref.value).toBe(name);
    }
    expect(PREFECTURES).toHaveLength(47);
  });

  it('不正な都道府県でエラーになる', () => {
    expect(() => new Prefecture('東京')).toThrow('不正な都道府県です');
  });

  it('空文字でエラーになる', () => {
    expect(() => new Prefecture('')).toThrow('不正な都道府県です');
  });

  it('同じ値のPrefectureはequalsでtrueを返す', () => {
    const p1 = new Prefecture('大阪府');
    const p2 = new Prefecture('大阪府');
    expect(p1.equals(p2)).toBe(true);
  });

  it('異なる値のPrefectureはequalsでfalseを返す', () => {
    const p1 = new Prefecture('東京都');
    const p2 = new Prefecture('大阪府');
    expect(p1.equals(p2)).toBe(false);
  });
});
