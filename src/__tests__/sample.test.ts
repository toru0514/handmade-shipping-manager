import { describe, it, expect } from 'vitest';

describe('サンプルテスト', () => {
  it('1 + 1 は 2 である', () => {
    expect(1 + 1).toBe(2);
  });

  it('文字列の結合が正しく動作する', () => {
    expect('hello' + ' ' + 'world').toBe('hello world');
  });

  it('配列の長さが正しい', () => {
    const items = ['minne', 'creema'];
    expect(items).toHaveLength(2);
  });
});
