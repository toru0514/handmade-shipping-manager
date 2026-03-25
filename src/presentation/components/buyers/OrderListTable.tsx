'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { OrderSummaryDto } from '@/application/usecases/ListAllOrdersUseCase';
import { PlatformChip, StatusChip } from '@/presentation/components/common';

interface OrderListTableProps {
  orders: OrderSummaryDto[];
  isLoading: boolean;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function OrderListTable({ orders, isLoading }: OrderListTableProps) {
  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography variant="body2" color="text.secondary" component="span">
          読み込み中...
        </Typography>
      </Paper>
    );
  }

  if (orders.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">注文データがありません</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>PF</TableCell>
            <TableCell>購入者名</TableCell>
            <TableCell>住所</TableCell>
            <TableCell>商品名</TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell>購入日</TableCell>
            <TableCell>発送日</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={`${order.platform}-${order.orderId}-${order.orderedAt}`} hover>
              <TableCell>
                <PlatformChip platform={order.platform} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {order.buyerName}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {order.prefecture}
                </Typography>
              </TableCell>
              <TableCell>
                <Box
                  sx={{
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {order.productName}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <StatusChip status={order.status} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(order.orderedAt)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {order.shippedAt ? formatDate(order.shippedAt) : '-'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
