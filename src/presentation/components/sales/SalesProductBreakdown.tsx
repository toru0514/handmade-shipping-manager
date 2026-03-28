'use client';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ProductSalesDto } from '@/application/usecases/GetSalesSummaryUseCase';
import { formatCurrency } from '@/presentation/utils/format';

interface SalesProductBreakdownProps {
  readonly breakdown: ProductSalesDto[];
}

export function SalesProductBreakdown({ breakdown }: SalesProductBreakdownProps) {
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
            <TableCell>商品名</TableCell>
            <TableCell align="right">販売数</TableCell>
            <TableCell align="right">注文数</TableCell>
            <TableCell align="right">売上</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {breakdown.map((product, index) => (
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
