// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { PendingOrderCard } from '../PendingOrderCard';

function createDto(overrides: Partial<PendingOrderDto> = {}): PendingOrderDto {
  return {
    orderId: 'ORD-001',
    platform: 'minne',
    buyerName: '山田 太郎',
    productName: 'ハンドメイドアクセサリー',
    orderedAt: '2026-02-15T00:00:00.000Z',
    daysSinceOrder: 2,
    isOverdue: false,
    ...overrides,
  };
}

describe('PendingOrderCard', () => {
  const noop = () => {};

  it('注文情報が正しく表示される', () => {
    render(
      <PendingOrderCard
        order={createDto()}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    expect(screen.getByText('ハンドメイドアクセサリー')).toBeInTheDocument();
    expect(screen.getByText('#ORD-001')).toBeInTheDocument();
    expect(screen.getByText('minne')).toBeInTheDocument();
    expect(screen.getByText('2日経過')).toBeInTheDocument();
  });

  it('超過注文の場合に警告が表示される', () => {
    render(
      <PendingOrderCard
        order={createDto({ isOverdue: true, daysSinceOrder: 5 })}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('3日以上経過しています');
  });

  it('超過でない注文には警告が表示されない', () => {
    render(
      <PendingOrderCard
        order={createDto({ isOverdue: false })}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('発送完了ボタンが表示される', () => {
    render(
      <PendingOrderCard
        order={createDto()}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    expect(screen.getByRole('button', { name: '発送完了' })).toBeInTheDocument();
  });

  it('購入お礼ボタン押下時にコールバックが呼ばれる', () => {
    const onRequestPurchaseThanks = vi.fn();

    render(
      <PendingOrderCard
        order={createDto()}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={onRequestPurchaseThanks}
      />,
    );

    const button = screen.getByRole('button', { name: '購入お礼' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onRequestPurchaseThanks).toHaveBeenCalledWith(createDto());
  });

  it('creema プラットフォームのラベルが表示される', () => {
    render(
      <PendingOrderCard
        order={createDto({ platform: 'creema' })}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    expect(screen.getByText('creema')).toBeInTheDocument();
  });

  it('超過注文は赤枠スタイルが適用される', () => {
    render(
      <PendingOrderCard
        order={createDto({ isOverdue: true, daysSinceOrder: 4 })}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    const card = screen.getByTestId('order-card-ORD-001');
    expect(card.className).toContain('border-red-400');
    expect(card.className).toContain('bg-red-50');
  });

  it('通常注文はデフォルトスタイルが適用される', () => {
    render(
      <PendingOrderCard
        order={createDto({ isOverdue: false })}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
      />,
    );

    const card = screen.getByTestId('order-card-ORD-001');
    expect(card.className).toContain('border-gray-200');
    expect(card.className).toContain('bg-white');
  });

  it('購入お礼生成中はボタンが無効化される', () => {
    render(
      <PendingOrderCard
        order={createDto()}
        onRequestShipmentComplete={noop}
        onRequestPurchaseThanks={noop}
        isGeneratingPurchaseThanks
      />,
    );

    expect(screen.getByRole('button', { name: '生成中...' })).toBeDisabled();
  });
});
