import { describe, it, expect } from 'vitest';
import { MessageTemplateType } from '../MessageTemplateType';

describe('MessageTemplateType', () => {
  it('purchase_thanksを作成できる', () => {
    const type = new MessageTemplateType('purchase_thanks');
    expect(type.value).toBe('purchase_thanks');
  });

  it('shipping_noticeを作成できる', () => {
    const type = new MessageTemplateType('shipping_notice');
    expect(type.value).toBe('shipping_notice');
  });

  it('静的インスタンスが正しい', () => {
    expect(MessageTemplateType.PurchaseThanks.value).toBe('purchase_thanks');
    expect(MessageTemplateType.ShippingNotice.value).toBe('shipping_notice');
  });

  it('不正なテンプレート種別でエラーになる', () => {
    expect(() => new MessageTemplateType('invalid')).toThrow('不正なテンプレート種別です');
  });

  it('空文字でエラーになる', () => {
    expect(() => new MessageTemplateType('')).toThrow('不正なテンプレート種別です');
  });

  it('同じ値のMessageTemplateTypeはequalsでtrueを返す', () => {
    const t1 = new MessageTemplateType('purchase_thanks');
    const t2 = new MessageTemplateType('purchase_thanks');
    expect(t1.equals(t2)).toBe(true);
  });

  it('異なる値のMessageTemplateTypeはequalsでfalseを返す', () => {
    expect(MessageTemplateType.PurchaseThanks.equals(MessageTemplateType.ShippingNotice)).toBe(
      false,
    );
  });

  it('toStringで値を返す', () => {
    expect(MessageTemplateType.PurchaseThanks.toString()).toBe('purchase_thanks');
  });
});
