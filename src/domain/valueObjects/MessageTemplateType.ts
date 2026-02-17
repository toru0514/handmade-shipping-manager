/**
 * MessageTemplateType — テンプレート種別（purchase_thanks / shipping_notice）
 */
export const MessageTemplateTypeValues = ['purchase_thanks', 'shipping_notice'] as const;
export type MessageTemplateTypeValue = (typeof MessageTemplateTypeValues)[number];

export class MessageTemplateType {
  readonly value: MessageTemplateTypeValue;

  constructor(value: string) {
    if (!MessageTemplateTypeValues.includes(value as MessageTemplateTypeValue)) {
      throw new Error(
        `不正なテンプレート種別です: ${value}（purchase_thanks / shipping_notice のみ対応）`,
      );
    }
    this.value = value as MessageTemplateTypeValue;
  }

  static readonly PurchaseThanks = new MessageTemplateType('purchase_thanks');
  static readonly ShippingNotice = new MessageTemplateType('shipping_notice');

  equals(other: MessageTemplateType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
