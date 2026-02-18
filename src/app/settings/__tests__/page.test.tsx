// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SettingsPage from '../page';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('SettingsPage (UC-010)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  });

  it('テンプレート編集・保存が動作し、DR-MSG-002 を満たさないと保存エラーになる', async () => {
    render(<SettingsPage />);

    const textarea = await screen.findByLabelText('テンプレート本文');
    expect((textarea as HTMLTextAreaElement).value).toContain('{{buyer_name}}');

    fireEvent.change(textarea, { target: { value: '変数なし本文' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'テンプレートには最低1つの変数を含めてください',
      );
    });

    fireEvent.change(textarea, {
      target: { value: '{{buyer_name}} 様\nご購入ありがとうございます。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('テンプレートを保存しました');
    });
  });

  it('変数一覧が表示され、挿入とプレビューが動作する', async () => {
    render(<SettingsPage />);
    const textarea = await screen.findByLabelText('テンプレート本文');

    expect(screen.getByText('{{buyer_name}}')).toBeInTheDocument();
    expect(screen.getByText('{{product_name}}')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '挿入' })[0]!);
    expect(String((textarea as HTMLTextAreaElement).value)).toContain('{{buyer_name}}');

    fireEvent.click(screen.getByRole('button', { name: 'プレビュー' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'プレビュー' })).toBeInTheDocument();
      expect(screen.getByText(/山田 太郎/)).toBeInTheDocument();
    });
  });

  it('デフォルトに戻す機能が動作する', async () => {
    render(<SettingsPage />);
    const textarea = await screen.findByLabelText('テンプレート本文');

    fireEvent.change(textarea, { target: { value: '{{buyer_name}} 様\n自由文です。' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('テンプレートを保存しました');
    });

    fireEvent.click(screen.getByRole('button', { name: 'デフォルトに戻す' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('テンプレートをデフォルトに戻しました');
      expect((textarea as HTMLTextAreaElement).value).toContain('{{product_name}}');
    });
  });
});
