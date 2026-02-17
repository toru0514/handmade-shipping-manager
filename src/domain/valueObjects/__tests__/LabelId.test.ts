import { describe, it, expect } from 'vitest';
import { LabelId } from '../LabelId';

describe('LabelId', () => {
  it('有効な伝票IDを作成できる', () => {
    const id = new LabelId('LBL-001');
    expect(id.value).toBe('LBL-001');
  });

  it('前後の空白がトリムされる', () => {
    const id = new LabelId('  LBL-001  ');
    expect(id.value).toBe('LBL-001');
  });

  it('空文字でエラーになる', () => {
    expect(() => new LabelId('')).toThrow('伝票IDは空にできません');
  });

  it('空白のみでエラーになる', () => {
    expect(() => new LabelId('   ')).toThrow('伝票IDは空にできません');
  });

  it('同じ値のLabelIdはequalsでtrueを返す', () => {
    const id1 = new LabelId('LBL-001');
    const id2 = new LabelId('LBL-001');
    expect(id1.equals(id2)).toBe(true);
  });

  it('異なる値のLabelIdはequalsでfalseを返す', () => {
    const id1 = new LabelId('LBL-001');
    const id2 = new LabelId('LBL-002');
    expect(id1.equals(id2)).toBe(false);
  });

  it('toStringで値を返す', () => {
    const id = new LabelId('LBL-001');
    expect(id.toString()).toBe('LBL-001');
  });
});
