'use client';

import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { SalesOrderDto } from '@/application/usecases/GetSalesSummaryUseCase';
import { PlatformChip } from '@/presentation/components/common';
import { formatDate, formatCurrency } from '@/presentation/utils/format';

interface SalesTableProps {
  readonly orders: SalesOrderDto[];
  readonly isLoading?: boolean;
}

export function SalesTable({ orders, isLoading = false }: SalesTableProps) {
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
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }} data-testid="sales-table-empty">
        <Typography color="text.secondary">発送済みの注文がありません</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" data-testid="sales-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>PF</TableCell>
            <TableCell>購入者名</TableCell>
            <TableCell>商品名</TableCell>
            <TableCell align="right">金額</TableCell>
            <TableCell>発送日</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={`${order.platform}-${order.orderId}`}
              hover
              sx={order.priceMissing ? { bgcolor: 'warning.50' } : undefined}
            >
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
                  {order.productName}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {order.priceMissing ? (
                  <Typography variant="body2" color="warning.main" fontWeight={500}>
                    ⚠ 未入力
                  </Typography>
                ) : (
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(order.totalPrice)}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(order.shippedAt)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
