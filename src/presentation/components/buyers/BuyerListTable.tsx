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
import type { BuyerDetailDto } from '@/application/usecases/SearchBuyersUseCase';
import { formatCurrency, formatDate } from '@/presentation/utils/format';

interface BuyerListTableProps {
  buyers: BuyerDetailDto[];
  selectedBuyerId: string | null;
  isLoading: boolean;
  onSelectBuyer: (buyerId: string) => void;
}

export function BuyerListTable({
  buyers,
  selectedBuyerId,
  isLoading,
  onSelectBuyer,
}: BuyerListTableProps) {
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

  if (buyers.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">該当する購入者がいません</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>購入者名</TableCell>
            <TableCell>都道府県</TableCell>
            <TableCell align="right">購入回数</TableCell>
            <TableCell align="right">総購入金額</TableCell>
            <TableCell>最終購入日</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {buyers.map((buyer) => (
            <TableRow
              key={buyer.buyerId}
              hover
              selected={buyer.buyerId === selectedBuyerId}
              onClick={() => onSelectBuyer(buyer.buyerId)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {buyer.buyerName}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {buyer.prefecture}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{buyer.orderCount}件</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatCurrency(buyer.totalAmount)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(buyer.lastOrderedAt)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
