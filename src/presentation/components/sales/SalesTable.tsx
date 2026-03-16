'use client';

import type { SalesOrderDto } from '@/application/usecases/GetSalesSummaryUseCase';

interface SalesTableProps {
  readonly orders: SalesOrderDto[];
  readonly isLoading?: boolean;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function getPlatformBadgeClass(platform: string): string {
  switch (platform) {
    case 'minne':
      return 'bg-pink-100 text-pink-800';
    case 'creema':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function SalesTable({ orders, isLoading = false }: SalesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-white p-8 text-center"
        data-testid="sales-table-empty"
      >
        <p className="text-gray-500">発送済みの注文がありません</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm"
      data-testid="sales-table"
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              PF
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              購入者名
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              商品名
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              金額
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              発送日
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {orders.map((order) => (
            <tr key={`${order.platform}-${order.orderId}`} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPlatformBadgeClass(order.platform)}`}
                >
                  {order.platform}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {order.buyerName}
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-500">
                {order.productName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                {formatCurrency(order.totalPrice)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {formatDate(order.shippedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
