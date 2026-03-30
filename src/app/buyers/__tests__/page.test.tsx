// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import BuyersPage from '../page';

function createAllOrdersResponse(orders: Record<string, unknown>[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/orders/all') {
      return new Response(JSON.stringify(orders), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  });
}

describe('BuyersPage (UC-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('購入者一覧が表示され、行クリックで詳細が表示される', async () => {
    const fetchMock = createAllOrdersResponse([
      {
        orderId: 'ORD-001',
        platform: 'creema',
        buyerName: '山田 太郎',
        postalCode: '1000001',
        prefecture: '東京都',
        city: '千代田区',
        street: '千代田1-1',
        phoneNumber: '09012345678',
        productName: 'ピアス',
        totalPrice: 3000,
        status: 'shipped',
        orderedAt: '2026-02-16T00:00:00.000Z',
        shippedAt: '2026-02-17T00:00:00.000Z',
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);
    render(<BuyersPage />);

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    // 行クリックで詳細表示
    fireEvent.click(screen.getByText('山田 太郎'));

    expect(screen.getByText('購入者詳細: 山田 太郎 様')).toBeInTheDocument();
    expect(screen.getByText('電話番号: 09012345678')).toBeInTheDocument();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
  });

  it('タイトルが「購入者一覧」と表示される', async () => {
    vi.stubGlobal('fetch', createAllOrdersResponse([]));
    render(<BuyersPage />);

    expect(screen.getByText('購入者一覧')).toBeInTheDocument();
  });

  it('検索で購入者名・商品名をフィルタリングできる', async () => {
    const fetchMock = createAllOrdersResponse([
      {
        orderId: 'ORD-001',
        platform: 'creema',
        buyerName: '山田 太郎',
        postalCode: '1000001',
        prefecture: '東京都',
        city: '千代田区',
        street: '千代田1-1',
        productName: 'ピアス',
        totalPrice: 3000,
        status: 'shipped',
        orderedAt: '2026-02-16T00:00:00.000Z',
        shippedAt: null,
      },
      {
        orderId: 'ORD-002',
        platform: 'minne',
        buyerName: '佐藤 花子',
        postalCode: '1500001',
        prefecture: '東京都',
        city: '渋谷区',
        street: '神宮前1-2-3',
        productName: 'リング',
        totalPrice: 5000,
        status: 'pending',
        orderedAt: '2026-02-15T00:00:00.000Z',
        shippedAt: null,
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);
    render(<BuyersPage />);

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
    });

    // 購入者名で検索
    fireEvent.change(screen.getByLabelText('検索'), { target: { value: '山田' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.queryByText('佐藤 花子')).not.toBeInTheDocument();
    });

    // 商品名で検索
    fireEvent.change(screen.getByLabelText('検索'), { target: { value: 'リング' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => {
      expect(screen.queryByText('山田 太郎')).not.toBeInTheDocument();
      expect(screen.getByText('佐藤 花子')).toBeInTheDocument();
    });
  });

  it('検索結果が0件の場合にメッセージを表示する', async () => {
    const fetchMock = createAllOrdersResponse([
      {
        orderId: 'ORD-001',
        platform: 'creema',
        buyerName: '山田 太郎',
        postalCode: '1000001',
        prefecture: '東京都',
        city: '千代田区',
        street: '千代田1-1',
        productName: 'ピアス',
        totalPrice: 3000,
        status: 'shipped',
        orderedAt: '2026-02-16T00:00:00.000Z',
        shippedAt: null,
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);
    render(<BuyersPage />);

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('検索'), { target: { value: '該当なし' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => {
      expect(screen.getByText('該当する購入者がいません')).toBeInTheDocument();
    });
  });
});
