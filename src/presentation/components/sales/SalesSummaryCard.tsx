'use client';

interface SalesSummaryCardProps {
  readonly totalSales: number;
  readonly totalOrders: number;
  readonly averageOrderValue: number;
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

export function SalesSummaryCard({
  totalSales,
  totalOrders,
  averageOrderValue,
}: SalesSummaryCardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3" data-testid="sales-summary-card">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">総売上</div>
        <div className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">注文件数</div>
        <div className="mt-1 text-2xl font-bold text-gray-900">{totalOrders}件</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">平均単価</div>
        <div className="mt-1 text-2xl font-bold text-gray-900">
          {formatCurrency(averageOrderValue)}
        </div>
      </div>
    </div>
  );
}
