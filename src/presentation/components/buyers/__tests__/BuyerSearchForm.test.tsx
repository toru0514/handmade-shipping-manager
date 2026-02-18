// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BuyerSearchForm } from '../BuyerSearchForm';

describe('BuyerSearchForm', () => {
  it('検索ボタンで入力値を onSearch に渡す', async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<BuyerSearchForm onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('購入者名'), { target: { value: '山田' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    expect(onSearch).toHaveBeenCalledWith('山田');
  });

  it('クリアボタンで空文字検索を呼ぶ', async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<BuyerSearchForm onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('購入者名'), { target: { value: '山田' } });
    fireEvent.click(screen.getByRole('button', { name: 'クリア' }));

    expect(screen.getByLabelText('購入者名')).toHaveValue('');
    expect(onSearch).toHaveBeenCalledWith('');
  });
});
