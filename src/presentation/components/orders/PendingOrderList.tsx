import Grid from '@mui/material/Grid';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { EmptyState } from '@/presentation/components/common';
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
    return <EmptyState message="発送待ちの注文はありません" data-testid="empty-orders" />;
  }

  return (
    <Grid container spacing={2} data-testid="pending-order-list">
      {orders.map((order) => (
        <Grid
          key={`${order.platform}-${order.orderId}-${order.orderedAt}`}
          size={{ xs: 12, sm: 6, lg: 4 }}
        >
          <PendingOrderCard
            order={order}
            onRequestShipmentComplete={onRequestShipmentComplete}
            onRequestPurchaseThanks={onRequestPurchaseThanks}
            onRequestIssueLabel={onRequestIssueLabel}
            isGeneratingPurchaseThanks={generatingPurchaseThanksOrderId === order.orderId}
            isIssuingLabel={issuingLabelOrderId === order.orderId}
          />
        </Grid>
      ))}
    </Grid>
  );
}
