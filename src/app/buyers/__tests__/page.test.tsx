// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import BuyersPage from '../page';

describe('BuyersPage (UC-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('購入者名検索が動作し、詳細情報を表示できる', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/buyers/search?name=')) {
        return new Response(
          JSON.stringify([
            {
              buyerName: '山田 太郎',
              postalCode: '1000001',
              prefecture: '東京都',
              city: '千代田区',
              street: '千代田1-1',
              phoneNumber: '09012345678',
              orderCount: 2,
              totalAmount: 5500,
              firstOrderedAt: '2026-02-15T00:00:00.000Z',
              lastOrderedAt: '2026-02-16T00:00:00.000Z',
              orderHistory: [
                {
                  orderId: 'ORD-002',
                  platform: 'creema',
                  productName: 'ピアス',
                  price: 3000,
                  status: 'shipped',
                  orderedAt: '2026-02-16T00:00:00.000Z',
                },
              ],
            },
          ]),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);
    render(<BuyersPage />);

    fireEvent.change(screen.getByLabelText('購入者名'), { target: { value: '山田' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /山田 太郎/ })).toBeInTheDocument();
    });

    expect(screen.getByText('購入者詳細: 山田 太郎 様')).toBeInTheDocument();
    expect(screen.getByText('電話番号: 09012345678')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
  });

  it('検索結果が0件の場合にメッセージを表示する', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<BuyersPage />);

    fireEvent.change(screen.getByLabelText('購入者名'), { target: { value: '該当なし' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => {
      expect(screen.getByText('該当する購入者が見つかりませんでした')).toBeInTheDocument();
    });
  });
});
