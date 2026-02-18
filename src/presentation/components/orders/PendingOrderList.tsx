import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { PendingOrderCard } from './PendingOrderCard';

interface PendingOrderListProps {
  orders: PendingOrderDto[];
  onRequestShipmentComplete: (order: PendingOrderDto) => void;
}

export function PendingOrderList({ orders, onRequestShipmentComplete }: PendingOrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500" data-testid="empty-orders">
        発送待ちの注文はありません
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="pending-order-list">
      {orders.map((order) => (
        <PendingOrderCard
          key={order.orderId}
          order={order}
          onRequestShipmentComplete={onRequestShipmentComplete}
        />
      ))}
    </div>
  );
}
