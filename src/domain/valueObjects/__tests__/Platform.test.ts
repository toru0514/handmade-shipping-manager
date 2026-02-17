import { describe, it, expect } from 'vitest';
import { Platform } from '../Platform';

describe('Platform', () => {
  it('minneを作成できる', () => {
    const platform = new Platform('minne');
    expect(platform.value).toBe('minne');
  });

  it('creemaを作成できる', () => {
    const platform = new Platform('creema');
    expect(platform.value).toBe('creema');
  });

  it('静的インスタンスが正しい', () => {
    expect(Platform.Minne.value).toBe('minne');
    expect(Platform.Creema.value).toBe('creema');
  });

  it('不正なプラットフォームでエラーになる（DR-PLT-001）', () => {
    expect(() => new Platform('amazon')).toThrow('不正なプラットフォームです');
  });

  it('空文字でエラーになる', () => {
    expect(() => new Platform('')).toThrow('不正なプラットフォームです');
  });

  it('同じ値のPlatformはequalsでtrueを返す', () => {
    const p1 = new Platform('minne');
    const p2 = new Platform('minne');
    expect(p1.equals(p2)).toBe(true);
  });

  it('異なる値のPlatformはequalsでfalseを返す', () => {
    const p1 = new Platform('minne');
    const p2 = new Platform('creema');
    expect(p1.equals(p2)).toBe(false);
  });

  it('toStringで値を返す', () => {
    expect(Platform.Minne.toString()).toBe('minne');
  });
});
