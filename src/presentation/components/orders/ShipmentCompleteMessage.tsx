'use client';

export interface ShipmentCompleteData {
  readonly orderId: string;
  readonly shippedAt: string;
  readonly shippingMethod: string;
  readonly trackingNumber?: string;
}

interface ShipmentCompleteMessageProps {
  readonly open: boolean;
  readonly data: ShipmentCompleteData | null;
  readonly onClose: () => void;
}

function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shippingMethodLabel(method: string): string {
  if (method === 'click_post') return 'クリックポスト';
  if (method === 'yamato_compact') return '宅急便コンパクト';
  return method;
}

export function ShipmentCompleteMessage({ open, data, onClose }: ShipmentCompleteMessageProps) {
  if (!open || data === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-complete-title"
      >
        <h2 id="shipment-complete-title" className="mb-4 text-xl font-bold">
          発送完了
        </h2>

        <p className="mb-4 text-sm text-gray-700">注文 {data.orderId} を発送済みにしました。</p>

        <div className="mb-5 space-y-1 rounded border border-green-200 bg-green-50 p-3 text-sm">
          <p>発送日時: {formatDateTime(data.shippedAt)}</p>
          <p>配送方法: {shippingMethodLabel(data.shippingMethod)}</p>
          <p>追跡番号: {data.trackingNumber ?? '未入力'}</p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
