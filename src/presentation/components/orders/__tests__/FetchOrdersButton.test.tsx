// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FetchOrdersButton } from '../FetchOrdersButton';

describe('FetchOrdersButton', () => {
  it('通常時は未読取得ラベルを表示してクリック可能', () => {
    const onClick = vi.fn();

    render(<FetchOrdersButton platform="minne" isLoading={false} onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'minne 未読を取得 ▶' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ローディング中は無効化される', () => {
    const onClick = vi.fn();

    render(<FetchOrdersButton platform="minne" isLoading onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'minne 取得中...' });
    expect(button).toBeDisabled();
  });

  it('creema ラベルでも表示できる', () => {
    const onClick = vi.fn();
    render(<FetchOrdersButton platform="creema" isLoading={false} onClick={onClick} />);
    expect(screen.getByRole('button', { name: 'creema 未読を取得 ▶' })).toBeInTheDocument();
  });
});
