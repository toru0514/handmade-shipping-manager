'use client';

import Button from '@mui/material/Button';
import ContentCopy from '@mui/icons-material/ContentCopy';

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
    <Button variant="contained" startIcon={<ContentCopy />} onClick={() => void handleCopy()}>
      コピー
    </Button>
  );
}
