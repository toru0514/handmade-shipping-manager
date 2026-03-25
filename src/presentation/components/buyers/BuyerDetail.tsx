'use client';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import type { BuyerDetailDto } from '@/application/usecases/SearchBuyersUseCase';
import { StatusChip } from '@/presentation/components/common';
import { formatDate, formatCurrency } from '@/presentation/utils/format';

interface BuyerDetailProps {
  readonly buyer: BuyerDetailDto | null;
}

export function BuyerDetail({ buyer }: BuyerDetailProps) {
  if (buyer === null) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary" variant="body2">
          購入者を選択すると詳細が表示されます
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        購入者詳細: {buyer.buyerName} 様
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Stack spacing={0.5}>
          <Typography variant="body2">購入回数: {buyer.orderCount}回</Typography>
          <Typography variant="body2">総購入金額: {formatCurrency(buyer.totalAmount)}</Typography>
          <Typography variant="body2">初回購入日: {formatDate(buyer.firstOrderedAt)}</Typography>
          <Typography variant="body2">最終購入日: {formatDate(buyer.lastOrderedAt)}</Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            住所: {buyer.postalCode} {buyer.prefecture}
            {buyer.city}
            {buyer.street}
            {buyer.building ?? ''}
          </Typography>
          <Typography variant="body2">電話番号: {buyer.phoneNumber ?? '未登録'}</Typography>
        </Stack>
      </Paper>

      <TableContainer component={Box}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>注文番号</TableCell>
              <TableCell>購入日</TableCell>
              <TableCell>プラットフォーム</TableCell>
              <TableCell>購入品</TableCell>
              <TableCell align="right">金額</TableCell>
              <TableCell>ステータス</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {buyer.orderHistory.map((order) => (
              <TableRow key={`${order.platform}-${order.orderId}-${order.orderedAt}`}>
                <TableCell>{order.orderId}</TableCell>
                <TableCell>{formatDate(order.orderedAt)}</TableCell>
                <TableCell>{order.platform}</TableCell>
                <TableCell>{order.productName}</TableCell>
                <TableCell align="right">{formatCurrency(order.price)}</TableCell>
                <TableCell>
                  <StatusChip status={order.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
