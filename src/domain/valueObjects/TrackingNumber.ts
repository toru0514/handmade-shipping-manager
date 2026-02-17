/**
 * TrackingNumber — 追跡番号（配送方法ごとのフォーマット）
 */
export class TrackingNumber {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('追跡番号は空にできません');
    }
    this.value = trimmed;
  }

  equals(other: TrackingNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
