'use client';

import { useEffect, useState } from 'react';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { PendingOrderList } from '@/presentation/components/orders/PendingOrderList';

export default function OrdersPage() {
  const [orders, setOrders] = useState<PendingOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch('/api/orders/pending');
        if (!response.ok) {
          throw new Error('注文の取得に失敗しました');
        }
        const data = (await response.json()) as PendingOrderDto[];
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    void fetchOrders();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">発送前注文一覧</h1>

      {loading && (
        <div className="py-12 text-center text-gray-500" data-testid="loading">
          読み込み中...
        </div>
      )}

      {error && (
        <div className="rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && <PendingOrderList orders={orders} />}
    </main>
  );
}
