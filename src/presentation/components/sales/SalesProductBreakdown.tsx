'use client';

import { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import type { ProductSalesDto } from '@/application/usecases/GetSalesSummaryUseCase';
import { formatCurrency } from '@/presentation/utils/format';

type SortKey = 'productName' | 'totalQuantity' | 'orderCount' | 'totalSales';
type SortDirection = 'asc' | 'desc';

interface SalesProductBreakdownProps {
  readonly breakdown: ProductSalesDto[];
}

function comparator(a: ProductSalesDto, b: ProductSalesDto, key: SortKey): number {
  if (key === 'productName') {
    return a.productName.localeCompare(b.productName, 'ja');
  }
  return a[key] - b[key];
}

export function SalesProductBreakdown({ breakdown }: SalesProductBreakdownProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalSales');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...breakdown].sort((a, b) => dir * comparator(a, b, sortKey));
  }, [breakdown, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'productName' ? 'asc' : 'desc');
    }
  };

  if (breakdown.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">商品データがありません</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" data-testid="sales-product-breakdown">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sortDirection={sortKey === 'productName' ? sortDir : false}>
              <TableSortLabel
                active={sortKey === 'productName'}
                direction={sortKey === 'productName' ? sortDir : 'asc'}
                onClick={() => handleSort('productName')}
              >
                商品名
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sortDirection={sortKey === 'totalQuantity' ? sortDir : false}>
              <TableSortLabel
                active={sortKey === 'totalQuantity'}
                direction={sortKey === 'totalQuantity' ? sortDir : 'desc'}
                onClick={() => handleSort('totalQuantity')}
              >
                販売数
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sortDirection={sortKey === 'orderCount' ? sortDir : false}>
              <TableSortLabel
                active={sortKey === 'orderCount'}
                direction={sortKey === 'orderCount' ? sortDir : 'desc'}
                onClick={() => handleSort('orderCount')}
              >
                注文数
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sortDirection={sortKey === 'totalSales' ? sortDir : false}>
              <TableSortLabel
                active={sortKey === 'totalSales'}
                direction={sortKey === 'totalSales' ? sortDir : 'desc'}
                onClick={() => handleSort('totalSales')}
              >
                売上
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((product, index) => (
            <TableRow
              key={index}
              hover
              sx={product.priceMissing ? { bgcolor: 'warning.50' } : undefined}
            >
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {product.productName}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{product.totalQuantity}個</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {product.orderCount}件
                </Typography>
              </TableCell>
              <TableCell align="right">
                {product.priceMissing ? (
                  <Typography variant="body2" color="warning.main" fontWeight={500}>
                    ⚠ 未入力
                  </Typography>
                ) : (
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(product.totalSales)}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
