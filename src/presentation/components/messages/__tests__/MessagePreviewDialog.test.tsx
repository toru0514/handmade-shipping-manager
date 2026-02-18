// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MessagePreviewDialog } from '../MessagePreviewDialog';

describe('MessagePreviewDialog', () => {
  it('プレビュー表示とコピー通知が動作する', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
      },
    });

    render(
      <MessagePreviewDialog
        open
        orderId="ORD-001"
        message={`山田 太郎 様
ありがとうございます。`}
        title="購入お礼メッセージ"
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('注文 ORD-001 のメッセージプレビューです。')).toBeInTheDocument();
    expect(screen.getByText(/山田 太郎 様/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'コピー' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('山田 太郎 様\nありがとうございます。');
      expect(screen.getByRole('status')).toHaveTextContent('コピーしました');
    });

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
