'use client';

import type { BuyerDetailDto } from '@/application/usecases/SearchBuyersUseCase';

interface BuyerDetailProps {
  readonly buyer: BuyerDetailDto | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
}

function statusLabel(status: string): string {
  if (status === 'pending') return '発送前';
  if (status === 'shipped') return '発送済み';
  return status;
}

export function BuyerDetail({ buyer }: BuyerDetailProps) {
  if (buyer === null) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
        購入者を選択すると詳細が表示されます
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">購入者詳細: {buyer.buyerName} 様</h2>

      <div className="mb-4 grid gap-2 rounded border border-gray-100 bg-gray-50 p-3 text-sm">
        <p>購入回数: {buyer.orderCount}回</p>
        <p>総購入金額: {formatCurrency(buyer.totalAmount)}</p>
        <p>初回購入日: {formatDate(buyer.firstOrderedAt)}</p>
        <p>最終購入日: {formatDate(buyer.lastOrderedAt)}</p>
      </div>

      <div className="mb-4 rounded border border-gray-100 bg-gray-50 p-3 text-sm">
        <p>
          住所: {buyer.postalCode} {buyer.prefecture}
          {buyer.city}
          {buyer.street}
          {buyer.building ?? ''}
        </p>
        <p>電話番号: {buyer.phoneNumber ?? '未登録'}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-2 py-2 text-left">注文番号</th>
              <th className="px-2 py-2 text-left">購入日</th>
              <th className="px-2 py-2 text-left">プラットフォーム</th>
              <th className="px-2 py-2 text-left">購入品</th>
              <th className="px-2 py-2 text-right">金額</th>
              <th className="px-2 py-2 text-left">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {buyer.orderHistory.map((order) => (
              <tr key={order.orderId} className="border-b">
                <td className="px-2 py-2">{order.orderId}</td>
                <td className="px-2 py-2">{formatDate(order.orderedAt)}</td>
                <td className="px-2 py-2">{order.platform}</td>
                <td className="px-2 py-2">{order.productName}</td>
                <td className="px-2 py-2 text-right">{formatCurrency(order.price)}</td>
                <td className="px-2 py-2">{statusLabel(order.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
