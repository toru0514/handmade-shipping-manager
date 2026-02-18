'use client';

import { useState } from 'react';
import { CopyToClipboardButton } from './CopyToClipboardButton';

interface MessagePreviewDialogProps {
  readonly open: boolean;
  readonly orderId: string;
  readonly message: string;
  readonly title: string;
  readonly onClose: () => void;
}

export function MessagePreviewDialog({
  open,
  orderId,
  message,
  title,
  onClose,
}: MessagePreviewDialogProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-thanks-preview-title"
      >
        <h2 id="purchase-thanks-preview-title" className="mb-2 text-xl font-bold">
          {title}
        </h2>
        <p className="mb-4 text-sm text-gray-700">注文 {orderId} のメッセージプレビューです。</p>

        {notice && (
          <div className="mb-3 rounded bg-green-100 px-3 py-2 text-sm text-green-700" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <pre className="mb-4 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
          {message}
        </pre>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
            onClick={onClose}
          >
            閉じる
          </button>
          <CopyToClipboardButton
            content={message}
            onCopied={() => {
              setError(null);
              setNotice('コピーしました');
            }}
            onError={(messageText) => {
              setNotice(null);
              setError(messageText);
            }}
          />
        </div>
      </div>
    </div>
  );
}
