// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IssueLabelButton } from '../IssueLabelButton';

describe('IssueLabelButton', () => {
  it('伝票発行ボタン押下で選択中の配送方法を渡す', async () => {
    const onIssue = vi.fn(async () => undefined);

    render(<IssueLabelButton onIssue={onIssue} />);

    fireEvent.click(screen.getByRole('button', { name: '伝票発行' }));

    expect(onIssue).toHaveBeenCalledWith('click_post');
  });

  it('発行中は入力が無効化される', () => {
    const onIssue = vi.fn(async () => undefined);
    render(<IssueLabelButton isIssuing onIssue={onIssue} />);

    expect(screen.getByRole('button', { name: '発行中...' })).toBeDisabled();
    expect(screen.getByLabelText('配送方法')).toBeDisabled();
  });
});
