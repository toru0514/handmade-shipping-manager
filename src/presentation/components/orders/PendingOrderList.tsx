import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { PendingOrderCard } from './PendingOrderCard';

interface PendingOrderListProps {
  orders: PendingOrderDto[];
  onRequestShipmentComplete: (order: PendingOrderDto) => void;
  onRequestPurchaseThanks: (order: PendingOrderDto) => void;
  onRequestIssueLabel?: (order: PendingOrderDto, shippingMethod: string) => Promise<void>;
  generatingPurchaseThanksOrderId?: string | null;
  issuingLabelOrderId?: string | null;
}

export function PendingOrderList({
  orders,
  onRequestShipmentComplete,
  onRequestPurchaseThanks,
  onRequestIssueLabel,
  generatingPurchaseThanksOrderId = null,
  issuingLabelOrderId = null,
}: PendingOrderListProps) {
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
          key={`${order.platform}-${order.orderId}-${order.orderedAt}`}
          order={order}
          onRequestShipmentComplete={onRequestShipmentComplete}
          onRequestPurchaseThanks={onRequestPurchaseThanks}
          onRequestIssueLabel={onRequestIssueLabel}
          isGeneratingPurchaseThanks={generatingPurchaseThanksOrderId === order.orderId}
          isIssuingLabel={issuingLabelOrderId === order.orderId}
        />
      ))}
    </div>
  );
}
