'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';

interface ShipmentConfirmDialogProps {
  readonly open: boolean;
  readonly order: PendingOrderDto | null;
  readonly isSubmitting: boolean;
  readonly error?: string | null;
  readonly onClose: () => void;
  readonly onConfirm: (input: { shippingMethod: string; trackingNumber?: string }) => Promise<void>;
}

function shippingMethodLabel(method: string): string {
  if (method === 'click_post') return 'クリックポスト';
  if (method === 'yamato_compact') return '宅急便コンパクト';
  return method;
}

export function ShipmentConfirmDialog({
  open,
  order,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ShipmentConfirmDialogProps) {
  const [shippingMethod, setShippingMethod] = useState('click_post');
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    if (!open) return;
    setShippingMethod('click_post');
    setTrackingNumber('');
  }, [open, order?.orderId]);

  if (!open || order === null) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onConfirm({
      shippingMethod,
      trackingNumber,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-confirm-title"
      >
        <h2 id="shipment-confirm-title" className="mb-4 text-xl font-bold">
          発送完了確認
        </h2>

        <p className="mb-4 text-sm text-gray-700">以下の注文を発送済みにしますか？</p>

        <div className="mb-5 space-y-1 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
          <p>注文番号: {order.orderId}</p>
          <p>購入者: {order.buyerName} 様</p>
          <p>購入品: {order.productName}</p>
          <p>配送方法: {shippingMethodLabel(shippingMethod)}</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="shipping-method">
            配送方法
          </label>
          <select
            id="shipping-method"
            className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
            value={shippingMethod}
            onChange={(event) => setShippingMethod(event.target.value)}
            disabled={isSubmitting}
          >
            <option value="click_post">クリックポスト</option>
            <option value="yamato_compact">宅急便コンパクト</option>
          </select>

          <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="tracking-number">
            追跡番号（任意）
          </label>
          <input
            id="tracking-number"
            className="mb-5 w-full rounded border border-gray-300 px-3 py-2"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="例: 1234-5678-9012"
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? '更新中...' : '発送完了にする'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
