// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TemplatePreview } from '../TemplatePreview';

describe('TemplatePreview', () => {
  it('プレビュー内容を表示し、閉じるボタンでコールバックを呼ぶ', () => {
    const onClose = vi.fn();

    render(<TemplatePreview content="山田 太郎 様\nありがとうございます。" onClose={onClose} />);

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('プレビュー')).toBeInTheDocument();
    expect(screen.getByText(/山田 太郎 様/)).toBeInTheDocument();
    expect(screen.getByText(/ありがとうございます。/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
