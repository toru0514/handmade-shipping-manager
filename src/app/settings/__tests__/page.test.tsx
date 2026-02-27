// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SettingsPage from '../page';

const DEFAULT_TEMPLATE = {
  id: 'default-purchase-thanks',
  type: 'purchase_thanks',
  content:
    '{{buyer_name}} 様\n\nこの度は「{{product_name}}」をご購入いただき、誠にありがとうございます。',
  variables: ['buyer_name', 'product_name'],
};

function makeFetchMock(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    // GET テンプレート取得
    if (url.includes('/api/settings/templates/') && !url.includes('/reset') && method === 'GET') {
      return new Response(JSON.stringify(DEFAULT_TEMPLATE), { status: 200 });
    }

    // PUT テンプレート保存
    if (url.includes('/api/settings/templates/') && !url.includes('/reset') && method === 'PUT') {
      if ('putError' in overrides) {
        return new Response(JSON.stringify({ error: { message: overrides.putError as string } }), {
          status: 400,
        });
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as { content?: string };
      return new Response(
        JSON.stringify({ ...DEFAULT_TEMPLATE, content: body.content ?? DEFAULT_TEMPLATE.content }),
        { status: 200 },
      );
    }

    // POST リセット
    if (url.includes('/reset') && method === 'POST') {
      return new Response(JSON.stringify(DEFAULT_TEMPLATE), { status: 200 });
    }

    return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 });
  });
}

describe('SettingsPage (UC-010)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('テンプレート編集・保存が動作し、DR-MSG-002 を満たさないと保存エラーになる', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock({ putError: 'テンプレートには最低1つの変数を含めてください' }),
    );

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

    // 正常な保存 — fetch モックを正常版に差し替え
    vi.stubGlobal('fetch', makeFetchMock());
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
