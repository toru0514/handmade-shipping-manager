// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TemplateEditor } from '../TemplateEditor';

describe('TemplateEditor', () => {
  it('編集・保存・プレビュー・デフォルト復元の操作を呼び出せる', async () => {
    const onChange = vi.fn();
    const onSave = vi.fn(async () => undefined);
    const onPreview = vi.fn();
    const onResetToDefault = vi.fn(async () => undefined);

    render(
      <TemplateEditor
        value="初期値"
        onChange={onChange}
        onSave={onSave}
        onPreview={onPreview}
        onResetToDefault={onResetToDefault}
      />,
    );

    fireEvent.change(screen.getByLabelText('テンプレート本文'), {
      target: { value: '変更値' },
    });
    expect(onChange).toHaveBeenCalledWith('変更値');

    fireEvent.click(screen.getByRole('button', { name: 'プレビュー' }));
    expect(onPreview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'デフォルトに戻す' }));
    expect(onResetToDefault).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
