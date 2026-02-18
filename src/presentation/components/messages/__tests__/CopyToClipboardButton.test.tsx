// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CopyToClipboardButton } from '../CopyToClipboardButton';

describe('CopyToClipboardButton', () => {
  it('クリック時にクリップボードへコピーして onCopied を呼ぶ', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onCopied = vi.fn();
    const onError = vi.fn();
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
      },
    });

    render(<CopyToClipboardButton content="テスト本文" onCopied={onCopied} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: 'コピー' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('テスト本文');
      expect(onCopied).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it('クリップボード未対応環境では onError を呼ぶ', async () => {
    const onCopied = vi.fn();
    const onError = vi.fn();
    vi.stubGlobal('navigator', {});

    render(<CopyToClipboardButton content="テスト本文" onCopied={onCopied} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: 'コピー' }));

    await waitFor(() => {
      expect(onCopied).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith('この環境ではクリップボードにコピーできません');
    });
  });
});
