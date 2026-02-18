// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { ShipmentConfirmDialog } from '../ShipmentConfirmDialog';

function createOrder(): PendingOrderDto {
  return {
    orderId: 'ORD-001',
    platform: 'minne',
    buyerName: '山田 太郎',
    productName: 'アクセサリー',
    orderedAt: '2026-02-15T00:00:00.000Z',
    daysSinceOrder: 2,
    isOverdue: false,
  };
}

describe('ShipmentConfirmDialog', () => {
  it('open=false では表示されない', () => {
    render(
      <ShipmentConfirmDialog
        open={false}
        order={createOrder()}
        isSubmitting={false}
        onClose={() => {}}
        onConfirm={async () => {}}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('注文情報を表示し、確認時に入力値を渡す', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ShipmentConfirmDialog
        open
        order={createOrder()}
        isSubmitting={false}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('注文番号: ORD-001')).toBeInTheDocument();
    expect(screen.getByText('購入者: 山田 太郎 様')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('配送方法'), {
      target: { value: 'yamato_compact' },
    });
    fireEvent.change(screen.getByLabelText('追跡番号（任意）'), {
      target: { value: 'YMT1234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: '発送完了にする' }));

    expect(onConfirm).toHaveBeenCalledWith({
      shippingMethod: 'yamato_compact',
      trackingNumber: 'YMT1234567',
    });
  });

  it('キャンセルでonCloseが呼ばれる', () => {
    const onClose = vi.fn();

    render(
      <ShipmentConfirmDialog
        open
        order={createOrder()}
        isSubmitting={false}
        onClose={onClose}
        onConfirm={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('error が指定された場合はダイアログ内に表示する', () => {
    render(
      <ShipmentConfirmDialog
        open
        order={createOrder()}
        isSubmitting={false}
        error="発送済みの注文は変更できません"
        onClose={() => {}}
        onConfirm={async () => {}}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('発送済みの注文は変更できません');
  });
});
