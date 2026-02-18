'use client';

import { useState } from 'react';
import { MessagePreviewDialog } from '@/presentation/components/messages/MessagePreviewDialog';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ orderId: string; message: string } | null>(null);

  if (!open || data === null) {
    return null;
  }
  const currentData = data;

  async function handleGenerateShippingNotice() {
    setGenerationError(null);
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/orders/${currentData.orderId}/message/shipping-notice`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string } | string;
        };
        const message =
          typeof body.error === 'string'
            ? body.error
            : (body.error?.message ?? '発送連絡メッセージの生成に失敗しました');
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        orderId: string;
        message: string;
      };
      setPreview(payload);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : '発送連絡メッセージの生成に失敗しました',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
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

          <p className="mb-4 text-sm text-gray-700">
            注文 {currentData.orderId} を発送済みにしました。
          </p>

          <div className="mb-5 space-y-1 rounded border border-green-200 bg-green-50 p-3 text-sm">
            <p>発送日時: {formatDateTime(currentData.shippedAt)}</p>
            <p>配送方法: {shippingMethodLabel(currentData.shippingMethod)}</p>
            <p>追跡番号: {currentData.trackingNumber ?? '未入力'}</p>
          </div>

          {generationError && (
            <div role="alert" className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
              {generationError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={() => void handleGenerateShippingNotice()}
              disabled={isGenerating}
            >
              {isGenerating ? '生成中...' : '発送連絡を作成'}
            </button>
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

      <MessagePreviewDialog
        open={preview !== null}
        orderId={preview?.orderId ?? ''}
        message={preview?.message ?? ''}
        title="発送連絡メッセージ"
        onClose={() => setPreview(null)}
      />
    </>
  );
}
