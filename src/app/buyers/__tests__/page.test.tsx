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
              buyerKey: '山田 太郎::1000001::東京都::千代田区::千代田1-1::::09012345678',
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

  it('同姓同名が2件ある場合に選択した購入者の詳細へ切り替えられる', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify([
          {
            buyerKey: '佐藤 花子::1000001::東京都::千代田区::千代田1-1::::09011112222',
            buyerName: '佐藤 花子',
            postalCode: '1000001',
            prefecture: '東京都',
            city: '千代田区',
            street: '千代田1-1',
            phoneNumber: '09011112222',
            orderCount: 1,
            totalAmount: 2000,
            firstOrderedAt: '2026-02-10T00:00:00.000Z',
            lastOrderedAt: '2026-02-10T00:00:00.000Z',
            orderHistory: [
              {
                orderId: 'ORD-101',
                platform: 'minne',
                productName: 'A',
                price: 2000,
                status: 'shipped',
                orderedAt: '2026-02-10T00:00:00.000Z',
              },
            ],
          },
          {
            buyerKey: '佐藤 花子::1500001::東京都::渋谷区::神宮前1-2-3::::09033334444',
            buyerName: '佐藤 花子',
            postalCode: '1500001',
            prefecture: '東京都',
            city: '渋谷区',
            street: '神宮前1-2-3',
            phoneNumber: '09033334444',
            orderCount: 1,
            totalAmount: 2800,
            firstOrderedAt: '2026-02-12T00:00:00.000Z',
            lastOrderedAt: '2026-02-12T00:00:00.000Z',
            orderHistory: [
              {
                orderId: 'ORD-102',
                platform: 'creema',
                productName: 'B',
                price: 2800,
                status: 'pending',
                orderedAt: '2026-02-12T00:00:00.000Z',
              },
            ],
          },
        ]),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<BuyersPage />);

    fireEvent.change(screen.getByLabelText('購入者名'), { target: { value: '佐藤' } });
    fireEvent.click(screen.getByRole('button', { name: '検索' }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /佐藤 花子/ })).toHaveLength(2);
    });

    const buyerButtons = screen.getAllByRole('button', { name: /佐藤 花子/ });
    fireEvent.click(buyerButtons[1] as HTMLButtonElement);

    expect(screen.getByText('電話番号: 09033334444')).toBeInTheDocument();
    expect(screen.getByText('ORD-102')).toBeInTheDocument();
  });
});
