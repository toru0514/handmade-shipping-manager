/**
 * OrderId — 注文ID（プラットフォーム固有のフォーマット）
 */
export class OrderId {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('注文IDは空にできません');
    }
    this.value = value.trim();
  }

  equals(other: OrderId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
