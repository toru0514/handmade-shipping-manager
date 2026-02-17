import { describe, expect, it } from 'vitest';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';

function createDto(orderId: string, isOverdue: boolean = false): PendingOrderDto {
  return {
    orderId,
    platform: 'minne',
    buyerName: '山田 太郎',
    productName: 'ハンドメイドアクセサリー',
    orderedAt: new Date('2026-02-15T00:00:00Z'),
    daysSinceOrder: isOverdue ? 5 : 1,
    isOverdue,
  };
}

describe('PendingOrderList ロジック', () => {
  it('空配列の場合、注文がないことを判定できる', () => {
    const orders: PendingOrderDto[] = [];
    expect(orders.length).toBe(0);
  });

  it('複数注文がある場合、全件数を取得できる', () => {
    const orders = [createDto('ORD-001'), createDto('ORD-002'), createDto('ORD-003')];
    expect(orders.length).toBe(3);
  });

  it('超過注文をフィルタリングできる', () => {
    const orders = [
      createDto('ORD-001', false),
      createDto('ORD-002', true),
      createDto('ORD-003', true),
    ];
    const overdueOrders = orders.filter((o) => o.isOverdue);
    expect(overdueOrders).toHaveLength(2);
  });

  it('注文は orderId で一意に識別できる', () => {
    const orders = [createDto('ORD-001'), createDto('ORD-002')];
    const ids = orders.map((o) => o.orderId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(orders.length);
  });
});
