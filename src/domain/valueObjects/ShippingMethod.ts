/**
 * ShippingMethod — 配送方法（DR-SHP-001: click_post / yamato_compact のみ対応）
 */
export const ShippingMethodValues = ['click_post', 'yamato_compact'] as const;
export type ShippingMethodValue = (typeof ShippingMethodValues)[number];

export class ShippingMethod {
  readonly value: ShippingMethodValue;

  constructor(value: string) {
    if (!ShippingMethodValues.includes(value as ShippingMethodValue)) {
      throw new Error(`不正な配送方法です: ${value}（click_post / yamato_compact のみ対応）`);
    }
    this.value = value as ShippingMethodValue;
  }

  static readonly ClickPost = new ShippingMethod('click_post');
  static readonly YamatoCompact = new ShippingMethod('yamato_compact');

  equals(other: ShippingMethod): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
