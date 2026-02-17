/**
 * BuyerName — 購入者名（空文字不可、100文字以内）
 */
export class BuyerName {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('購入者名は空にできません');
    }
    if (trimmed.length > 100) {
      throw new Error('購入者名は100文字以内で入力してください');
    }
    this.value = trimmed;
  }

  equals(other: BuyerName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
