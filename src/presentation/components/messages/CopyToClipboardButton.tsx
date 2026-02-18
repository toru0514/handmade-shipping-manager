'use client';

interface CopyToClipboardButtonProps {
  readonly content: string;
  readonly onCopied?: () => void;
  readonly onError?: (message: string) => void;
}

export function CopyToClipboardButton({ content, onCopied, onError }: CopyToClipboardButtonProps) {
  async function handleCopy() {
    try {
      if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
        throw new Error('この環境ではクリップボードにコピーできません');
      }
      await navigator.clipboard.writeText(content);
      onCopied?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'コピーに失敗しました';
      onError?.(message);
    }
  }

  return (
    <button
      type="button"
      className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      onClick={() => void handleCopy()}
    >
      コピー
    </button>
  );
}
