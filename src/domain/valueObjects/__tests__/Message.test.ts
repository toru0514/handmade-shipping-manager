import { describe, it, expect } from 'vitest';
import { Message } from '../Message';

describe('Message', () => {
  it('有効なメッセージを作成できる', () => {
    const msg = new Message('ご購入ありがとうございます');
    expect(msg.content).toBe('ご購入ありがとうございます');
  });

  it('空文字でエラーになる', () => {
    expect(() => new Message('')).toThrow('メッセージは空にできません');
  });

  it('空白のみでエラーになる', () => {
    expect(() => new Message('   ')).toThrow('メッセージは空にできません');
  });

  it('同じ内容のMessageはequalsでtrueを返す', () => {
    const m1 = new Message('テスト');
    const m2 = new Message('テスト');
    expect(m1.equals(m2)).toBe(true);
  });

  it('異なる内容のMessageはequalsでfalseを返す', () => {
    const m1 = new Message('テスト1');
    const m2 = new Message('テスト2');
    expect(m1.equals(m2)).toBe(false);
  });

  it('toStringで内容を返す', () => {
    const msg = new Message('ご購入ありがとうございます');
    expect(msg.toString()).toBe('ご購入ありがとうございます');
  });
});
