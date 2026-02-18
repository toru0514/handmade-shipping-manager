// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { BuyerDetailDto } from '@/application/usecases/SearchBuyersUseCase';
import { BuyerDetail } from '../BuyerDetail';

function createBuyer(): BuyerDetailDto {
  return {
    buyerName: '山田 太郎',
    postalCode: '1000001',
    prefecture: '東京都',
    city: '千代田区',
    street: '千代田1-1',
    phoneNumber: '09012345678',
    orderCount: 2,
    totalAmount: 5500,
    firstOrderedAt: '2026-02-15T00:00:00.000Z',
    lastOrderedAt: '2026-02-16T00:00:00.000Z',
    orderHistory: [
      {
        orderId: 'ORD-002',
        platform: 'creema',
        productName: 'ピアス',
        price: 3000,
        status: 'shipped',
        orderedAt: '2026-02-16T00:00:00.000Z',
      },
      {
        orderId: 'ORD-001',
        platform: 'minne',
        productName: 'アクセサリー',
        price: 2500,
        status: 'pending',
        orderedAt: '2026-02-15T00:00:00.000Z',
      },
    ],
  };
}

describe('BuyerDetail', () => {
  it('buyer が null の場合はプレースホルダを表示する', () => {
    render(<BuyerDetail buyer={null} />);
    expect(screen.getByText('購入者を選択すると詳細が表示されます')).toBeInTheDocument();
  });

  it('購入者詳細（住所、履歴）を表示できる', () => {
    render(<BuyerDetail buyer={createBuyer()} />);

    expect(screen.getByText('購入者詳細: 山田 太郎 様')).toBeInTheDocument();
    expect(screen.getByText('購入回数: 2回')).toBeInTheDocument();
    expect(screen.getByText('電話番号: 09012345678')).toBeInTheDocument();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('発送前')).toBeInTheDocument();
    expect(screen.getByText('発送済み')).toBeInTheDocument();
  });
});
