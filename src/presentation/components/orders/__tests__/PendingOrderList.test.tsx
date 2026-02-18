// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { PendingOrderList } from '../PendingOrderList';

function createDto(orderId: string, isOverdue: boolean = false): PendingOrderDto {
  return {
    orderId,
    platform: 'minne',
    buyerName: '山田 太郎',
    productName: 'ハンドメイドアクセサリー',
    orderedAt: '2026-02-15T00:00:00.000Z',
    daysSinceOrder: isOverdue ? 5 : 1,
    isOverdue,
  };
}

describe('PendingOrderList', () => {
  const noop = () => {};

  it('注文がない場合は空メッセージが表示される', () => {
    render(
      <PendingOrderList
        orders={[]}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    expect(screen.getByTestId('empty-orders')).toBeInTheDocument();
    expect(screen.getByText('発送待ちの注文はありません')).toBeInTheDocument();
  });

  it('複数注文がカードとして表示される', () => {
    const orders = [createDto('ORD-001'), createDto('ORD-002'), createDto('ORD-003')];
    render(
      <PendingOrderList
        orders={orders}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    expect(screen.getByTestId('pending-order-list')).toBeInTheDocument();
    expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
    expect(screen.getByTestId('order-card-ORD-002')).toBeInTheDocument();
    expect(screen.getByTestId('order-card-ORD-003')).toBeInTheDocument();
  });

  it('超過注文の警告が正しく表示される', () => {
    const orders = [createDto('ORD-001', false), createDto('ORD-002', true)];
    render(
      <PendingOrderList
        orders={orders}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
  });

  it('注文がある場合は空メッセージが表示されない', () => {
    render(
      <PendingOrderList
        orders={[createDto('ORD-001')]}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    expect(screen.queryByTestId('empty-orders')).not.toBeInTheDocument();
  });
});
