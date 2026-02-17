import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';

interface PendingOrderCardProps {
  order: PendingOrderDto;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    minne: 'minne',
    creema: 'creema',
  };
  return labels[platform] ?? platform;
}

export function PendingOrderCard({ order }: PendingOrderCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${
        order.isOverdue ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
      }`}
      data-testid={`order-card-${order.orderId}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{platformLabel(order.platform)}</span>
        <span className="text-sm text-gray-400">#{order.orderId}</span>
      </div>

      <h3 className="mb-1 text-lg font-semibold">{order.buyerName}</h3>
      <p className="mb-3 text-sm text-gray-600">{order.productName}</p>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">注文日: {formatDate(order.orderedAt)}</span>
        <span className={order.isOverdue ? 'font-bold text-red-600' : 'text-gray-500'}>
          {order.daysSinceOrder}日経過
        </span>
      </div>

      {order.isOverdue && (
        <div
          className="mb-3 rounded bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700"
          role="alert"
        >
          3日以上経過しています
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
          disabled
          title="Phase 3 で実装予定"
        >
          購入お礼
        </button>
      </div>
    </div>
  );
}
