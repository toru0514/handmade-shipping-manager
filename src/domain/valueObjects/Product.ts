/**
 * Product — 商品（商品名、価格、数量）
 */
export class Product {
  readonly name: string;
  readonly price: number;
  readonly quantity: number;

  constructor(params: { name: string; price: number; quantity?: number }) {
    const trimmedName = params.name.trim();
    if (trimmedName.length === 0) {
      throw new Error('商品名は空にできません');
    }
    if (params.price < 0) {
      throw new Error('価格は0以上で入力してください');
    }
    const qty = params.quantity ?? 1;
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error('数量は1以上の整数で入力してください');
    }
    this.name = trimmedName;
    this.price = params.price;
    this.quantity = qty;
  }

  get subtotal(): number {
    return this.price * this.quantity;
  }

  equals(other: Product): boolean {
    return (
      this.name === other.name && this.price === other.price && this.quantity === other.quantity
    );
  }
}
