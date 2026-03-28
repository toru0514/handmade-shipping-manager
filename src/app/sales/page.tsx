'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SalesSummaryDto } from '@/application/usecases/GetSalesSummaryUseCase';
import { SalesFilterForm } from '@/presentation/components/sales/SalesFilterForm';
import { SalesSummaryCard } from '@/presentation/components/sales/SalesSummaryCard';
import { SalesPlatformBreakdown } from '@/presentation/components/sales/SalesPlatformBreakdown';
import { SalesMonthlyChart } from '@/presentation/components/sales/SalesMonthlyChart';
import { SalesProductBreakdown } from '@/presentation/components/sales/SalesProductBreakdown';
import { SalesTable } from '@/presentation/components/sales/SalesTable';

function getDefaultStartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function getDefaultEndDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SalesPage() {
  const [summary, setSummary] = useState<SalesSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultStartDate = useMemo(() => getDefaultStartDate(), []);
  const defaultEndDate = useMemo(() => getDefaultEndDate(), []);

  const fetchSummary = useCallback(
    async (params: {
      startDate: string;
      endDate: string;
      platform: 'minne' | 'creema' | 'all';
    }) => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          startDate: params.startDate,
          endDate: params.endDate,
          platform: params.platform,
        });

        const response = await fetch(`/api/sales/summary?${searchParams.toString()}`);
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? '売上集計の取得に失敗しました');
        }

        const data = (await response.json()) as SalesSummaryDto;
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchSummary({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      platform: 'all',
    });
  }, [fetchSummary, defaultStartDate, defaultEndDate]);

  const handleFilter = useCallback(
    async (params: {
      startDate: string;
      endDate: string;
      platform: 'minne' | 'creema' | 'all';
    }) => {
      await fetchSummary(params);
    },
    [fetchSummary],
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">売上集計</h1>

      <section className="mb-6">
        <SalesFilterForm
          isLoading={loading}
          defaultStartDate={defaultStartDate}
          defaultEndDate={defaultEndDate}
          onFilter={handleFilter}
        />
      </section>

      {error && (
        <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading && !summary && (
        <div className="py-12 text-center text-gray-500" data-testid="loading">
          読み込み中...
        </div>
      )}

      {summary && (
        <>
          <section className="mb-6">
            <SalesSummaryCard
              totalSales={summary.totalSales}
              totalOrders={summary.totalOrders}
              averageOrderValue={summary.averageOrderValue}
              ordersWithMissingPrice={summary.ordersWithMissingPrice}
            />
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <SalesMonthlyChart breakdown={summary.monthlyBreakdown} />
            <SalesPlatformBreakdown breakdown={summary.platformBreakdown} />
          </section>

          <section className="mb-6">
            <h2 className="mb-4 text-lg font-semibold">商品別売上</h2>
            <SalesProductBreakdown breakdown={summary.productBreakdown} />
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">注文一覧（発送済みのみ）</h2>
            <SalesTable orders={summary.orders} isLoading={loading} />
          </section>
        </>
      )}
    </main>
  );
}
