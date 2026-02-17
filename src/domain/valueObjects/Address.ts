/**
 * Address — 住所（DR-ADR-003: 郵便番号、都道府県、市区町村、番地は必須）
 */
import { PostalCode } from './PostalCode';
import { Prefecture } from './Prefecture';

export class Address {
  readonly postalCode: PostalCode;
  readonly prefecture: Prefecture;
  readonly city: string;
  readonly street: string;
  readonly building?: string;

  constructor(params: {
    postalCode: PostalCode;
    prefecture: Prefecture;
    city: string;
    street: string;
    building?: string;
  }) {
    if (!params.city || params.city.trim().length === 0) {
      throw new Error('市区町村は必須です');
    }
    if (!params.street || params.street.trim().length === 0) {
      throw new Error('番地は必須です');
    }
    this.postalCode = params.postalCode;
    this.prefecture = params.prefecture;
    this.city = params.city.trim();
    this.street = params.street.trim();
    this.building = params.building?.trim() || undefined;
  }

  fullAddress(): string {
    const parts = [this.prefecture.value, this.city, this.street];
    if (this.building) {
      parts.push(this.building);
    }
    return parts.join('');
  }

  formatForLabel(): string {
    const lines = [`〒${this.postalCode.formatted()}`, this.fullAddress()];
    return lines.join('\n');
  }

  equals(other: Address): boolean {
    return (
      this.postalCode.equals(other.postalCode) &&
      this.prefecture.equals(other.prefecture) &&
      this.city === other.city &&
      this.street === other.street &&
      this.building === other.building
    );
  }
}
