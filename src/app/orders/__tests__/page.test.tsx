// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import OrdersPage from '../page';

describe('OrdersPage (UC-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('発送完了フローで一覧から注文が消え、追跡番号を送信する', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/orders/pending') {
        return new Response(
          JSON.stringify([
            {
              orderId: 'ORD-001',
              platform: 'minne',
              buyerName: '山田 太郎',
              productName: 'ハンドメイドアクセサリー',
              orderedAt: '2026-02-15T00:00:00.000Z',
              daysSinceOrder: 2,
              isOverdue: false,
            },
          ]),
          { status: 200 },
        );
      }

      if (url === '/api/orders/ORD-001/ship' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            orderId: 'ORD-001',
            status: 'shipped',
            shippedAt: '2026-02-17T10:30:00.000Z',
            shippingMethod: 'click_post',
            trackingNumber: 'CP123456789JP',
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '発送完了' }));
    expect(screen.getByRole('dialog', { name: '発送完了確認' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('追跡番号（任意）'), {
      target: { value: 'CP123456789JP' },
    });
    fireEvent.click(screen.getByRole('button', { name: '発送完了にする' }));

    await waitFor(() => {
      expect(screen.getByTestId('empty-orders')).toBeInTheDocument();
    });

    expect(screen.getByText('注文 ORD-001 を発送済みにしました。')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/orders/ORD-001/ship', expect.anything());

    const postCall = fetchMock.mock.calls.find(
      (call) => String(call[0]) === '/api/orders/ORD-001/ship',
    );
    expect(postCall).toBeDefined();
    expect(postCall?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(postCall?.[1]?.body).toBe(
      JSON.stringify({
        shippingMethod: 'click_post',
        trackingNumber: 'CP123456789JP',
      }),
    );
  });

  it('発送更新に失敗しても一覧は表示されたままになる', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/orders/pending') {
        return new Response(
          JSON.stringify([
            {
              orderId: 'ORD-001',
              platform: 'minne',
              buyerName: '山田 太郎',
              productName: 'ハンドメイドアクセサリー',
              orderedAt: '2026-02-15T00:00:00.000Z',
              daysSinceOrder: 2,
              isOverdue: false,
            },
          ]),
          { status: 200 },
        );
      }

      if (url === '/api/orders/ORD-001/ship' && init?.method === 'POST') {
        return new Response(JSON.stringify({ error: '発送済みの注文は変更できません' }), {
          status: 400,
        });
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '発送完了' }));
    fireEvent.click(screen.getByRole('button', { name: '発送完了にする' }));

    await waitFor(() => {
      const dialog = screen.getByRole('dialog', { name: '発送完了確認' });
      expect(within(dialog).getByRole('alert')).toHaveTextContent('発送済みの注文は変更できません');
    });

    expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
  });

  it('購入お礼フローでプレビュー表示とコピー通知が動作する', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/orders/pending') {
        return new Response(
          JSON.stringify([
            {
              orderId: 'ORD-001',
              platform: 'minne',
              buyerName: '山田 太郎',
              productName: 'ハンドメイドアクセサリー',
              orderedAt: '2026-02-15T00:00:00.000Z',
              daysSinceOrder: 2,
              isOverdue: false,
            },
          ]),
          { status: 200 },
        );
      }

      if (url === '/api/orders/ORD-001/message/purchase-thanks') {
        return new Response(
          JSON.stringify({
            orderId: 'ORD-001',
            message: '山田 太郎 様\nご購入ありがとうございます。',
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText,
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByTestId('order-card-ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '購入お礼' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '購入お礼メッセージ' })).toBeInTheDocument();
      expect(screen.getByText(/ご購入ありがとうございます。/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'コピー' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('山田 太郎 様\nご購入ありがとうございます。');
      expect(screen.getByRole('status')).toHaveTextContent('コピーしました');
    });
  });
});
