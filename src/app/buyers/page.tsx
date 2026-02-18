'use client';

import { useCallback, useState } from 'react';
import type { BuyerDetailDto } from '@/application/usecases/SearchBuyersUseCase';
import { BuyerDetail } from '@/presentation/components/buyers/BuyerDetail';
import { BuyerSearchForm } from '@/presentation/components/buyers/BuyerSearchForm';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<BuyerDetailDto[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const selectedBuyer = buyers.find((buyer) => buyer.buyerId === selectedBuyerId) ?? null;

  const handleSearch = useCallback(async (buyerName: string) => {
    const keyword = buyerName.trim();
    setError(null);
    setSearched(true);

    if (keyword.length === 0) {
      setBuyers([]);
      setSelectedBuyerId(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/buyers/search?name=${encodeURIComponent(keyword)}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? '購入者情報の検索に失敗しました');
      }

      const data = (await response.json()) as BuyerDetailDto[];
      setBuyers(data);
      setSelectedBuyerId(data[0]?.buyerId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '購入者情報の検索に失敗しました');
      setBuyers([]);
      setSelectedBuyerId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">購入者検索</h1>

      <BuyerSearchForm isLoading={isLoading} onSearch={handleSearch} />

      {error && (
        <div className="mt-4 rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">検索結果</h2>
          {isLoading && <p className="text-sm text-gray-500">検索中...</p>}
          {!isLoading && searched && buyers.length === 0 && (
            <p className="text-sm text-gray-500">該当する購入者が見つかりませんでした</p>
          )}
          <ul className="space-y-2">
            {buyers.map((buyer) => (
              <li key={buyer.buyerId}>
                <button
                  type="button"
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${
                    selectedBuyerId === buyer.buyerId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBuyerId(buyer.buyerId)}
                >
                  <p className="font-medium">{buyer.buyerName}</p>
                  <p className="text-xs text-gray-500">
                    {buyer.orderCount}件 /{' '}
                    {new Intl.NumberFormat('ja-JP').format(buyer.totalAmount)}円
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <BuyerDetail buyer={selectedBuyer} />
      </section>
    </main>
  );
}
