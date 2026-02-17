/**
 * PostalCode — 郵便番号（DR-ADR-001: 7桁の数字、ハイフンなし）
 */
export class PostalCode {
  readonly value: string;

  constructor(value: string) {
    const normalized = value.replace(/-/g, '').trim();
    if (!/^\d{7}$/.test(normalized)) {
      throw new Error(`不正な郵便番号です: ${value}（7桁の数字で入力してください）`);
    }
    this.value = normalized;
  }

  /** ハイフン付きフォーマット（例: 123-4567） */
  formatted(): string {
    return `${this.value.slice(0, 3)}-${this.value.slice(3)}`;
  }

  equals(other: PostalCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
