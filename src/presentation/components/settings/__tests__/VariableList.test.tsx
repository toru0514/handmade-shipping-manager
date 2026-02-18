// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { VariableList } from '../VariableList';

describe('VariableList', () => {
  it('変数一覧を表示し、挿入ボタンでコールバックを呼ぶ', () => {
    const onInsert = vi.fn();

    render(
      <VariableList
        variables={[
          { name: 'buyer_name', label: '購入者名' },
          { name: 'product_name', label: '商品名' },
        ]}
        onInsert={onInsert}
      />,
    );

    expect(screen.getByText('{{buyer_name}}')).toBeInTheDocument();
    expect(screen.getByText('購入者名')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '挿入' })[0]!);
    expect(onInsert).toHaveBeenCalledWith('buyer_name');
  });
});
