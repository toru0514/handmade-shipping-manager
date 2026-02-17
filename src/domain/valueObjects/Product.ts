/**
 * Product — 商品（商品名、価格）
 */
export class Product {
  readonly name: string;
  readonly price: number;

  constructor(params: { name: string; price: number }) {
    const trimmedName = params.name.trim();
    if (trimmedName.length === 0) {
      throw new Error('商品名は空にできません');
    }
    if (params.price < 0) {
      throw new Error('価格は0以上で入力してください');
    }
    this.name = trimmedName;
    this.price = params.price;
  }

  equals(other: Product): boolean {
    return this.name === other.name && this.price === other.price;
  }
}
