import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import type { PendingOrderDto } from '@/application/usecases/ListPendingOrdersUseCase';
import { IssueLabelButton } from '@/presentation/components/labels/IssueLabelButton';
import { formatDate, platformLabel } from '@/presentation/utils/format';

interface PendingOrderCardProps {
  order: PendingOrderDto;
  onRequestShipmentComplete: (order: PendingOrderDto) => void;
  onRequestPurchaseThanks: (order: PendingOrderDto) => void;
  onRequestIssueLabel?: (order: PendingOrderDto, shippingMethod: string) => Promise<void>;
  isGeneratingPurchaseThanks?: boolean;
  isIssuingLabel?: boolean;
  canIssueLabel?: boolean;
}

export function PendingOrderCard({
  order,
  onRequestShipmentComplete,
  onRequestPurchaseThanks,
  onRequestIssueLabel,
  isGeneratingPurchaseThanks = false,
  isIssuingLabel = false,
  canIssueLabel = true,
}: PendingOrderCardProps) {
  return (
    <Card
      variant="outlined"
      data-testid={`order-card-${order.orderId}`}
      sx={{
        borderColor: order.isOverdue ? 'error.main' : 'divider',
        bgcolor: order.isOverdue ? 'error.50' : 'background.paper',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {platformLabel(order.platform)}
          </Typography>
          {order.transactionUrl ? (
            <Link
              href={order.transactionUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              color="text.disabled"
              underline="hover"
            >
              #{order.orderId}
            </Link>
          ) : (
            <Typography variant="body2" color="text.disabled">
              #{order.orderId}
            </Typography>
          )}
        </Box>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {order.buyerName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {order.productName}
        </Typography>

        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            注文日: {formatDate(order.orderedAt)}
          </Typography>
          <Typography
            variant="body2"
            color={order.isOverdue ? 'error' : 'text.secondary'}
            fontWeight={order.isOverdue ? 700 : 400}
          >
            {order.daysSinceOrder}日経過
          </Typography>
        </Box>

        {order.isOverdue && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            3日以上経過しています
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            color="success"
            onClick={() => onRequestShipmentComplete(order)}
          >
            発送完了
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={isGeneratingPurchaseThanks}
            onClick={() => onRequestPurchaseThanks(order)}
          >
            {isGeneratingPurchaseThanks ? '生成中...' : '購入お礼'}
          </Button>
        </Box>

        {onRequestIssueLabel && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <IssueLabelButton
              disabled={!canIssueLabel}
              isIssuing={isIssuingLabel}
              onIssue={async (shippingMethod) => onRequestIssueLabel(order, shippingMethod)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
