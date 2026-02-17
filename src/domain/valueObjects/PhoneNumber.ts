/**
 * PhoneNumber — 電話番号（有効な日本の電話番号形式、optional）
 */
export class PhoneNumber {
  readonly value: string;

  constructor(value: string) {
    const normalized = value.replace(/[-\s]/g, '').trim();
    if (normalized.length === 0) {
      throw new Error('電話番号は空にできません');
    }
    // 日本の電話番号: 0から始まる10〜11桁の数字
    if (!/^0\d{9,10}$/.test(normalized)) {
      throw new Error(
        `不正な電話番号です: ${value}（0から始まる10〜11桁の数字で入力してください）`,
      );
    }
    this.value = normalized;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
