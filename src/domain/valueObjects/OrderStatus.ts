/**
 * OrderStatus — 注文ステータス（DR-ORD-003: pending / shipped の2状態のみ）
 */
export const OrderStatusValues = ['pending', 'shipped'] as const;
export type OrderStatusValue = (typeof OrderStatusValues)[number];

export class OrderStatus {
  readonly value: OrderStatusValue;

  constructor(value: string) {
    if (!OrderStatusValues.includes(value as OrderStatusValue)) {
      throw new Error(`不正な注文ステータスです: ${value}（pending / shipped のみ対応）`);
    }
    this.value = value as OrderStatusValue;
  }

  static readonly Pending = new OrderStatus('pending');
  static readonly Shipped = new OrderStatus('shipped');

  isPending(): boolean {
    return this.value === 'pending';
  }

  isShipped(): boolean {
    return this.value === 'shipped';
  }

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
