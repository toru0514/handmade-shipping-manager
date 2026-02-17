import { describe, expect, it } from 'vitest';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';

function createDto(overrides: Partial<PendingOrderDto> = {}): PendingOrderDto {
  return {
    orderId: 'ORD-001',
    platform: 'minne',
    buyerName: '山田 太郎',
    productName: 'ハンドメイドアクセサリー',
    orderedAt: new Date('2026-02-15T00:00:00Z'),
    daysSinceOrder: 2,
    isOverdue: false,
    ...overrides,
  };
}

describe('PendingOrderDto', () => {
  it('通常の注文 DTO が正しい構造を持つ', () => {
    const dto = createDto();
    expect(dto.orderId).toBe('ORD-001');
    expect(dto.platform).toBe('minne');
    expect(dto.buyerName).toBe('山田 太郎');
    expect(dto.productName).toBe('ハンドメイドアクセサリー');
    expect(dto.daysSinceOrder).toBe(2);
    expect(dto.isOverdue).toBe(false);
  });

  it('超過注文の DTO は isOverdue が true になる', () => {
    const dto = createDto({
      daysSinceOrder: 5,
      isOverdue: true,
    });
    expect(dto.isOverdue).toBe(true);
    expect(dto.daysSinceOrder).toBe(5);
  });

  it('creema プラットフォームの注文を扱える', () => {
    const dto = createDto({ platform: 'creema' });
    expect(dto.platform).toBe('creema');
  });
});
