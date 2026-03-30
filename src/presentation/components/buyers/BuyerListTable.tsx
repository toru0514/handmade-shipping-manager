'use client';

import { useMemo, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import type { BuyerDetailDto } from '@/application/usecases/SearchBuyersUseCase';
import { formatCurrency, formatDate } from '@/presentation/utils/format';

type SortKey = 'buyerName' | 'prefecture' | 'orderCount' | 'totalAmount' | 'lastOrderedAt';
type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'buyerName', label: '購入者名' },
  { key: 'prefecture', label: '都道府県' },
  { key: 'orderCount', label: '購入回数', align: 'right' },
  { key: 'totalAmount', label: '総購入金額', align: 'right' },
  { key: 'lastOrderedAt', label: '最終購入日' },
];

function compareBuyers(a: BuyerDetailDto, b: BuyerDetailDto, key: SortKey): number {
  switch (key) {
    case 'buyerName':
      return a.buyerName.localeCompare(b.buyerName, 'ja');
    case 'prefecture':
      return a.prefecture.localeCompare(b.prefecture, 'ja');
    case 'orderCount':
      return a.orderCount - b.orderCount;
    case 'totalAmount':
      return a.totalAmount - b.totalAmount;
    case 'lastOrderedAt':
      return a.lastOrderedAt.localeCompare(b.lastOrderedAt);
  }
}

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
  const [sortKey, setSortKey] = useState<SortKey>('lastOrderedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedBuyers = useMemo(() => {
    const sorted = [...buyers].sort((a, b) => compareBuyers(a, b, sortKey));
    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [buyers, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'buyerName' || key === 'prefecture' ? 'asc' : 'desc');
    }
  };

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
            {COLUMNS.map((col) => (
              <TableCell key={col.key} align={col.align}>
                <TableSortLabel
                  active={sortKey === col.key}
                  direction={sortKey === col.key ? sortDirection : 'asc'}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedBuyers.map((buyer) => (
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
